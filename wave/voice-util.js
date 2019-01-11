    window.audioProcessor = function(option){
        var args = arguments;
        if(args.length<=0){
            console.error("缺少参数，无法初始化");
            return;
        }
        if(option == undefined){
            console.error("缺少配置参数，无法初始化");
            return;
        }
        // if(typeof dom == "string"){
        //     dom = document.getElementById(dom);
        // }else if(typeof dom != "object"){
        //     console.error("processor params inlegal");
        //     return null;
        // }
        //html config -- size
        this.textSize = 40;//加载文字大小
        this.processHeight = 30;
        this.processToolHeigth = 4;
        this.meterWidth = 14, //width of the meters in the spectrum
        this.gap = 2, //gap between meters
        this.capHeight = 2,
        this.voiceValue = 100;//音量控制
        //html config -- dom and dom animation
        this.container = null;//容器
        this.canvas = null;//画布
        this.animationId = null;//canvas动画标记号
        this.allCapsReachBottom = false;//canvas 上的动画是否全部结束标志
        this.player = null;//播放暂停按钮
        this.timeDigit = null;//播放时间dom
        this.timeProgress = null;//播放进度dom
        this.playDurationId = null;//页面刷新时间和进度的定时器
        this.volumnCtrl = null;//音量按钮
        //audio config -- audio node and play status control
        this.audioContext = null;//audio 根节点
        this.source = null; //the audio byte 数据
        this.gain = null;//音量控制节点
        this.audioBufferSouceNode = null;//存储buffer节点
        this.analyser = null;//分析器
        this.duration = 0;//audio时长
        this.startAt = 0;//开始时刻;
        this.seekAtTime = 0;//seek时刻;
        this.status = 0; //flag for sound is playing 1 or stopped 0
        this.gainNode = null;// 音频节点
        this.gainValue = 0.2;// 初始音量
        this.curVoice = null;//当前音量
        this.ballVoice = null;//音量调节球
        this.soundTimeout = null;
        //自定义业务config
        var default_option = {
            loop:true,
            autoplay:true,
            controls:true,
            animation: "wave" //line | histogram | wave
        };
        this.OPTION = option || default_option;
        if(!this.OPTION.controls){
            this.OPTION.autoplay = true;
        }
        this.browserSupport_();
        if(args[1] && args[2]){
             this.playAudio(args[1],args[2]);
        }
        // this.initialize(dom,audioAddress);//初始化
        return this;
    }
    window.audioProcessor.prototype = {
        playAudio: function(container,audioAddress){
            this.stop();
            this.createPlayer_(container);
            this.loadFile_(audioAddress);
        },
        // initialize: function(container,audioAddress){
        //     this.browserSupport_();
        //     this.createPlayer_(container);
        //     this.loadFile_(audioAddress);
        // },
        browserSupport_: function(){//检测浏览器是否支持
            // window.AudioContext = null;
            window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
            window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
            window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
            try {
                this.audioContext = new AudioContext();
            } catch (e) {
                console.log('Your browser does not support AudioContext');
                console.log(e);
            }
        },

        createPlayer_: function(container){//创建canvas和进度条
            if(typeof container == "string"){
                container = document.getElementById(container);
            }else if(typeof container != "object"){
                console.error("processor params inlegal");
                return null;
            }

            if(this.audioContext.currentTime){
                this.audioContext.currentTime = 0;
                this.startAt = 0;
                this.seekAtTime = 0;
            }
            
            this.container = container;
            container.innerHTML = "";
            var _this = this;
            var canvas = document.createElement('canvas');
            canvas.width = container.offsetWidth;
            if(this.OPTION.controls){
                canvas.height = container.offsetHeight - this.processHeight;
            }else{
                canvas.height = container.offsetHeight;
            }
            canvas.style.background = "#000000";
            var processbar = document.createElement('div');
            processbar.style.height = this.processHeight + "px";
            processbar.style.width = "100%";
            processbar.style.background = "#ededed";
            processbar.style.position = "absolute";
            processbar.style.bottom = 0;
            //---------------------------------------------
            var spanPlay = document.createElement('span');//播放按钮
            spanPlay.style.height = "100%";
            spanPlay.style.float = "left";
            spanPlay.style.display = "inline-block";
            spanPlay.style.width = this.processHeight+"px";
            var imgPlay = document.createElement("img");
            imgPlay.style.height = this.processHeight + "px";
            imgPlay.style.opacity = "0.6";
            imgPlay.src = "./images/play.png";
            spanPlay.appendChild(imgPlay);

            var spanTimeTool = document.createElement('span');//进度条
            spanTimeTool.style.height = "100%";
            spanTimeTool.style.float = "left";
            spanTimeTool.style.display = "inline-block";
            spanTimeTool.style.width = "calc(100% - "+5*this.processHeight+"px)";
            var processToolContainer = document.createElement("div");
            processToolContainer.style.height = this.processToolHeigth + "px";
            processToolContainer.style.cursor = "pointer"
            processToolContainer.style.background = "#333333";
            processToolContainer.style.margin = ""+0.5*(this.processHeight-this.processToolHeigth)+"px 0";

            var processToolPercentage = document.createElement("span");
            processToolPercentage.style.display = "inline-block";
            processToolPercentage.style.height = "100%";
            processToolPercentage.style.background = "red";
            processToolPercentage.style.width = "0";
            processToolPercentage.style.float = "left";
            processToolContainer.appendChild(processToolPercentage);
            spanTimeTool.appendChild(processToolContainer);

            var spanTimeDigit = document.createElement('span');//播放时间
            spanTimeDigit.style.height = "100%";
            spanTimeDigit.style.float = "left";
            spanTimeDigit.style.display = "inline-block";
            spanTimeDigit.style.width = 3*this.processHeight + "px";
            spanTimeDigit.style.lineHeight = this.processHeight +"px";
            spanTimeDigit.style.textAlign = "center";
            spanTimeDigit.innerText = "00:00:00";

            var spanSound = document.createElement('span');//调节音量
            spanSound.style.height = "100%";
            spanSound.style.float = "left";
            spanSound.style.display = "inline-block";
            spanSound.style.width = this.processHeight +"px";
            var imgSound = document.createElement("img");
            imgSound.style.height = this.processHeight + "px";
            imgSound.style.cursor = "pointer";
            imgSound.src = "./images/sound.png";
            imgSound.volumn = 100;
            spanSound.appendChild(imgSound);
            //----------------------------------以下音量------------------------------------------------------
            var vocChange = document.createElement('span');//音量调节
            vocChange.style.height = "120px";
            vocChange.style.width = "30px";
            vocChange.style.position = "absolute";
            vocChange.style.left = "0";
            vocChange.style.top = "-120px";//负掉自身的高度
            vocChange.style.background = "white";
            vocChange.style.zIndex = "20";
            vocChange.style.display = 'none';
            vocChange.className = "audioVocChange";
            var vocTotal = document.createElement('span');//音量总值
            vocTotal.style.height = "100px";
            vocTotal.style.width = "4px";
            vocTotal.style.position = "absolute";
            vocTotal.style.left = "13px";
            vocTotal.style.bottom = "10px";
            vocTotal.style.background = "#ccc";
            vocTotal.style.cursor = "pointer";
            vocTotal.style.zIndex = "21";
            var vocCurrent = document.createElement('span');//音量当前值
            vocCurrent.style.height = this.gainValue * 100 + "px";//音量默认值
            vocCurrent.style.width = "4px";
            vocCurrent.style.position = "absolute";
            vocCurrent.style.left = "13px";
            vocCurrent.style.bottom = "10px";
            vocCurrent.style.background = "#00f3ff";
            vocCurrent.style.cursor = "pointer";
            vocCurrent.style.zIndex = "22";
            this.curVoice = vocCurrent;
            var vocBall = document.createElement('span');//音量调节球
            vocBall.style.height = "20px";
            vocBall.style.width = "20px";
            vocBall.style.border = "1px solid #ccc";
            vocBall.style.borderRadius = "50%";
            vocBall.style.position = "absolute";
            vocBall.style.left = "4px";
            vocBall.style.bottom = this.gainValue * 100 + "px";//音量默认值
            vocBall.style.background = "white";
            vocBall.draggable = 'true';
            vocBall.style.cursor = "pointer";
            vocBall.style.zIndex = "23";

            this.ballVoice = vocBall;

            vocChange.appendChild(vocTotal);
            vocChange.appendChild(vocCurrent);
            vocChange.appendChild(vocBall);
            spanSound.appendChild(vocChange);

            vocBall.onmousedown = function(e) {
                var that = this;
                var e = e || window.event;
                var diffY = e.clientY - this.offsetTop; 

                document.onmousemove = function(e) {
                    var e = e || window.event; 
                    e.preventDefault();
                    var top=e.clientY-diffY;
                    that.style.left = '4px';

                    if(top >= 100){
                        top = 100;
                        that.style.top = '100px';
                    }
                    else if(top <= 0){
                        top = 0;
                        that.style.top = '0';
                    }else{
                        that.style.top = top + 'px';
                    }
                    vocCurrent.style.height = (100 - top) + "px";
                    var curRate = parseFloat((100 - top)/100);
                    _this.gainValue = curRate;// 音量变化
                    if(_this.gainNode && _this.gainNode.gain){
                        try{
                            _this.gainNode.gain.setValueAtTime(curRate,_this.audioContext.currentTime - _this.startAt);
                        }catch(e){
                            console.log(e.error);
                        }
                    }else{
                        debugger;
                    }
                };
                document.onmouseup = function(e) {
                    this.onmousemove = null;  
                    this.onmouseup = null;
                }; 
            };
            //----------------------------------以上音量------------------------------------------------------

            imgSound.addEventListener('click',function(e) {
                if(vocChange.style.display == "block"){
                    vocChange.style.display = "none"
                }else{
                    vocChange.style.display = "block";
                }
            });

            imgSound.onmouseover = function(){
                clearTimeout(_this.soundTimeout);
            }
            vocTotal.onmouseover = function(){
                clearTimeout(_this.soundTimeout);
            }
            vocCurrent.onmouseover = function(){
                clearTimeout(_this.soundTimeout);
            }
            vocBall.onmouseover = function(){
                clearTimeout(_this.soundTimeout);
            }
            vocChange.onmouseover = function(){
                clearTimeout(_this.soundTimeout);
            }

            imgSound.onmouseout = function(){
                _this.soundTimeout = setTimeout(function(){
                    vocChange.style.display = 'none';
                },2000)
            }
            vocChange.onmouseout = function(){
                _this.soundTimeout = setTimeout(function(){
                    vocChange.style.display = 'none';
                },2000)
            }

            


            processbar.appendChild(spanPlay);
            processbar.appendChild(spanTimeTool);
            processbar.appendChild(spanTimeDigit);
            processbar.appendChild(spanSound);
            //---------------------------------------------
            container.appendChild(canvas);
            container.appendChild(processbar);
            if(!this.OPTION.controls){
                processbar.style.display = "none";
            }

            this.canvas = canvas;
            this.player = imgPlay;//播放暂停按钮
            this.volumnCtrl = imgSound;//音量调节
            this.timeDigit = spanTimeDigit;//播放时间dom
            this.timeProgress = processToolPercentage;//播放进度dom
        },
        loadFile_: function(address){//加载文件
            var _this = this;
            if(!_this.audioContext){return;}
            var ctx = _this.canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.font = "bold "+_this.textSize+"px '字体','字体','微软雅黑','宋体'"; //设置字体
            ctx.textBaseline = 'hanging'; //在绘制文本时使用的当前文本基线
            var str = "文件加载中";
            var loading = setInterval(function(){
                if(str.indexOf("...")>=0){
                    str = str.replace("...","");
                }else{
                    str+="."
                }
                ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
                ctx.fillText(str ,(_this.canvas.width-6*_this.textSize)/2 ,(_this.canvas.height-_this.textSize)/2); //设置文本内容
            },500);
            var request = new XMLHttpRequest(); //建立一个请求
            request.open('GET', address, true); //配置好请求类型，文件路径等
            request.responseType = 'arraybuffer'; //配置数据返回类型
            // 一旦获取完成，对音频进行进一步操作，比如解码
            request.onload = function() {
                var arraybuffer = request.response;
                _this.audioContext.decodeAudioData(arraybuffer, function(buffer) {

                    clearInterval(loading);
                    ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
                    ctx.fillText('文件加载成功' ,(_this.canvas.width-6*_this.textSize)/2 ,(_this.canvas.height-_this.textSize)/2);

                    _this.bindEvent_(_this.audioContext, buffer);//元素绑定
                    _this.bindHTMLEvent_(_this.audioContext, buffer);

                }, function(e) {
                    clearInterval(loading);
                    ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
                    ctx.fillText('文件加载失败' ,(_this.canvas.width-6*_this.textSize)/2 ,(_this.canvas.height-_this.textSize)/2);

                    console.log('decode failed');
                    console.error(e);
                });
            }
            request.send();
        },
        bindEvent_: function(audioContext, buffer){
            //获取资源的总时长
            this.loadTime_(buffer);
            //防止有之前的缓存，清空
            if (this.animationId !== null) {
                cancelAnimationFrame(this.animationId);
            }
            if (this.source !== null) {
                this.source = null;
            }
            this.status = 0;
            this.source = buffer;//buffer数据缓存
            this.createBufferSouceNode(audioContext,buffer);
        },
        createBufferSouceNode: function(audioContext, buffer){
            var _this = this;
            var audioBufferSouceNode = audioContext.createBufferSource();
            audioBufferSouceNode.buffer = buffer;
            var analyser = audioContext.createAnalyser();
            _this.gainNode = audioContext.createGain();
            //连接：audioBufferSouceNode → analyser → Gain → destination
            audioBufferSouceNode.connect(analyser);
            analyser.connect(_this.gainNode);
            _this.gainNode.connect(audioContext.destination);
            _this.gainNode.gain.setValueAtTime(_this.gainValue,_this.audioContext.currentTime - _this.startAt);

            //兼容写法 防止浏览器未实现start 和 stop方法
            if (!audioBufferSouceNode.start) {
                audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
                audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOff method
            };
            this.audioBufferSouceNode = audioBufferSouceNode;
            this.analyser = analyser;
            // this.gain = Gain;
        },
        bindHTMLEvent_:function(audioContext, buffer){
            var _this = this;
            //播放按钮事件
            this.player.style.cursor = "pointer";
            this.player.style.opacity = "1";
            this.player.src = "./images/play.png";
            this.player.playerStatus = false;//是不是正在播放
            this.player.addEventListener('click',function(){//播放按钮
                if(_this.status ==0){this.playerStatus = false}
                if(this.playerStatus){//播放ing，执行暂停
                    _this.pause();
                }else{//暂停或者停止ing，执行播放
                    //在暂停处播放
                    if(_this.status == 0){
                        _this.createBufferSouceNode(audioContext, buffer);
                        _this.playPause(0);
                    }else{
                        _this.playPause(-1);
                    }
                }
            });
            //进度条控制按钮
            this.timeProgress.parentNode.onclick = function(e){
                if(_this.status == 0){
                    return;
                }
                _this.stop();//停止前一个实例
                var position = e.offsetX;//点击位置的长
                var total = this.offsetWidth;//进度条总长
                _this.timeProgress.style.width = position+"px";
                //根据百分比计算点击处的时间
                _this.seekAtTime = Math.floor(_this.duration * position/total);
                console.log("点击处时间:"+_this.utils.secondsToclock(_this.seekAtTime));
                _this.timeDigit.innerText = _this.utils.secondsToclock(_this.seekAtTime);
                //创建新的播放实例
                _this.createBufferSouceNode(audioContext, buffer);
                //在指定秒处播放
                _this.playPause(_this.seekAtTime);
            }
            if(this.OPTION.autoplay){
                this.playPause(0);
            }
        },
        end_: function(instance) {
            var _this = this;
            console.log("---------"+Math.floor(_this.audioContext.currentTime - _this.startAt + _this.seekAtTime - _this.duration));
            if(Math.floor(_this.audioContext.currentTime - _this.startAt + _this.seekAtTime -_this.duration>=0)){
                this.status = 0;
                clearInterval(_this.playDurationId);
                _this.timeProgress.style.width = 0;
                _this.timeDigit.innerText = _this.utils.secondsToclock(0);
                _this.player.src = "./images/play.png";
                _this.seekAtTime = 0;
                // _this.createBufferSouceNode(_this.audioContext,_this.source);

            }
        },
        playPause: function(Seektime){
            var _this = this;
            _this.player.src = "./images/pause.png";
            if(_this.status == 0 || Seektime >= 0){//资源未被播放过
                _this.startAt = _this.audioContext.currentTime;
                _this.audioBufferSouceNode.start(0,Seektime);
                _this.audioBufferSouceNode.onended = function() {
                    _this.end_(_this);
                };
                _this._drawSpectrum(_this.analyser);
                _this.audioContext.resume();//这个是防止在暂停状态下进行切换播放mp3
            }else{
                _this.audioContext.resume();
            }
            _this.playDurationId = setInterval(function(){
                // console.log(Math.floor(_this.audioContext.currentTime-_this.startAt+_this.seekAtTime));
                //页面进度显示
                _this.timeProgress.style.width = (_this.audioContext.currentTime-_this.startAt+_this.seekAtTime)/_this.duration * 100 +"%";
                //页面时间显示
                _this.timeDigit.innerText = _this.utils.secondsToclock(Math.floor(_this.audioContext.currentTime-_this.startAt+_this.seekAtTime));
            },1000);
            _this.player.playerStatus = true;
            _this.status = 1;
        },
        pause:  function(){
            var _this = this;
            _this.player.src = "./images/play.png";
            _this.audioContext.suspend();
            clearInterval(_this.playDurationId);
            _this.player.playerStatus = false;
        },
        stop: function(){
            var _this = this;
            clearInterval(_this.playDurationId);
            cancelAnimationFrame(_this.animationId);
            if(_this.audioBufferSouceNode&&_this.status==1){
                _this.audioBufferSouceNode.stop();
            }
            // _this.analyser.disconnect();
        },
        loadTime_: function(buffer){
            var totleTime = Math.floor(buffer.duration);
            this.duration = totleTime;
            console.log('video duration is: '+totleTime+" seconds");
        },
        _drawSpectrum: function(analyser) {
            var _this = this,
                canvas = this.canvas,
                cwidth = canvas.width,
                cheight = canvas.height - _this.capHeight,
                meterWidth = _this.meterWidth, //width of meters in the spectrum
                gap = _this.gap, //gap between meters
                capHeight = _this.capHeight,
                capStyle = 'black',
                meterNum = cwidth / (meterWidth + gap), //count of the meters
                capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame
            // canvas.clearRect(0, 0, cwidth, cheight);
            var ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(1, '#0f0');
            gradient.addColorStop(0.5, '#ff0');
            gradient.addColorStop(0, '#f00');
            var drawMeter = null;
            if(_this.OPTION.animation == "line"){
                ctx.fillStyle = gradient;
                drawMeter = function() {
                    var array = new Uint8Array(analyser.frequencyBinCount*36000/48000);
                    analyser.getByteFrequencyData(array);
                    //清理画布
                    ctx.clearRect(0, 0, cwidth, cheight);
                    //只绘制出当前宽度内的线
                    /*
                    *从频率分布数据中可以看到数组中大于800的数据都是0 
                    */
                    for (var i = 0; i < cwidth*2; i += 2) {
                        var value = array[i/2];
                    ctx.fillRect(i, cheight - value, 1, cheight);
                    }
                    _this.animationId = requestAnimationFrame(drawMeter);
                }
            }else if(_this.OPTION.animation == "histogram"){
                drawMeter = function() {
                    // analyser.frequencyBinCount基本电脑默认是1024 48000经过傅里叶变换成1024大小
                    // 36000/48000 为音频采集设备的最高Hz除以48000
                    var array = new Uint8Array(analyser.frequencyBinCount*36000/48000);
                    analyser.getByteFrequencyData(array);
                    if (_this.status === 0) {
                        //fix when some sounds end the value still not back to zero
                        for (var i = array.length - 1; i >= 0; i--) {
                            array[i] = 0;
                        };
                        allCapsReachBottom = true;
                        for (var i = capYPositionArray.length - 1; i >= 0; i--) {
                            allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
                        };
                        if (allCapsReachBottom) {
                            cancelAnimationFrame(_this.animationId); //since the sound is stoped and animation finished, stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
                            ctx.clearRect(0, 0, cwidth, cheight+_this.capHeight);
                            return;
                        };
                    };
                    var step = Math.floor(array.length / meterNum); //sample limited data from the total array
                    ctx.clearRect(0, 0, cwidth, cheight);
                    for (var i = 0; i < meterNum; i++) {
                        var value = array[i * step];
                        if (capYPositionArray.length < Math.round(meterNum)) {
                            capYPositionArray.push(value);
                        };
                        ctx.fillStyle = capStyle;
                        //draw the cap, with transition effect
                        if (value < capYPositionArray[i]) {
                            ctx.fillRect(i * (meterWidth + gap), cheight - (--capYPositionArray[i]), meterWidth, capHeight);
                        } else {
                            ctx.fillRect(i * (meterWidth + gap), cheight - value, meterWidth, capHeight);
                            capYPositionArray[i] = value;
                        };
                        ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
                        ctx.fillRect(i * (meterWidth + gap) /*meterWidth+gap*/ , cheight - value + capHeight, meterWidth, cheight); //the meter
                    }
                    _this.animationId = requestAnimationFrame(drawMeter);
                }
            }else if(_this.OPTION.animation == "wave"){
                drawMeter = function() {
                    var bufferLength = analyser.frequencyBinCount*36000/48000;
                    var array = new Uint8Array(bufferLength);
                    analyser.getByteTimeDomainData(array);
                    ctx.fillStyle = 'rgb(200, 200, 200)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgb(0, 0, 0)';
                    ctx.beginPath();
                    var sliceWidth = canvas.width * 2.0 / bufferLength;
                    var x = 0;
                    for (var i = 0; i < bufferLength; i++) {
                        var v = array[i] / 128.0;
                        var y = v * canvas.height / 2;
                        if (i === 0) {
                          ctx.moveTo(x, y);
                        } else {
                          ctx.lineTo(x, y);
                        }
                        x += sliceWidth;
                        }
                    ctx.lineTo(canvas.width, canvas.height / 2);
                    ctx.stroke();
                    _this.animationId = requestAnimationFrame(drawMeter);
                }
            }

            _this.animationId = requestAnimationFrame(drawMeter);
        },
        utils:{
            secondsToclock: function(secondsNum){//计算时间
                var str = "";
                secondsNum = secondsNum*1;
                if(typeof secondsNum == "number"){
                    var hh = Math.floor(secondsNum/3600);
                    var mm = Math.floor((secondsNum-(hh*3600))/60);
                    var ss = Math.floor(secondsNum%60);
                    if(hh < 10){
                        hh = "0"+hh;
                    }
                    if(mm < 10){
                        mm = "0"+mm;
                    }
                    if(ss < 10){
                        ss = "0"+ss;
                    }
                }
                return hh+":"+mm+":"+ss;
            }
        }
    }
