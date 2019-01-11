;
(function(w,doc){
    var myUitl = function(){
        this.extend = function(obj) {//方便使用者扩展
            for (var p in obj) {
                Bee.prototype[p] = obj[p];
            }
        };
        this.nullToBlank = function(obj){//空值转为"",非空不变
            return (null == obj || typeof obj == "undefined")?"":obj;
        };
        this.isChinese = function(str){//判断是不是中文
            var reg = /^([u4E00-u9FA5]|[uFE30-uFFA0])*$/;
            if(reg.test(str)){
                return false;
            }
            return true;
        };
        this.isNumber = function(value){//判断是不是数值
            if(typeof value == "number"){
                return true;
            }else if(typeof value == "string"){
                if( value != null && value.length>0 && isNaN(value) == false){
                    return true;
                }else{
                    return false;
                }
            }else{
                return false;
            }
        };
        this.dateFormat = function(dates,format) { // dates 支持时间戳或者时间格式  format为格式化格式 e.g "yyyy-MM-DD hh-mm-ss.S"
            if(typeof dates == "number") dates = new Date(dates);
            var date = {
                "M+": dates.getMonth() + 1,
                "d+": dates.getDate(),
                "h+": dates.getHours(),
                "m+": dates.getMinutes(),
                "s+": dates.getSeconds(),
                "q+": Math.floor((dates.getMonth() + 3) / 3),
                "S+": dates.getMilliseconds()
            };
            if (/(y+)/i.test(format)) {
                    format = format.replace(RegExp.$1, (dates.getFullYear() + '').substr(4 - RegExp.$1.length));
            }
            for (var k in date) {
                if (new RegExp("(" + k + ")").test(format)) {
                        format = format.replace(RegExp.$1, RegExp.$1.length == 1
                            ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
                }
            }
           return format;
        };

        this.formSingleFileUpload = function(inputId,address,uploadComplete,uploadFailed,uploadProgress,uploadCanceled){//单文件form表单上传 包含进度
            // function uploadProgress(evt) {//上传中回调函数
            //     if (evt.lengthComputable) {
            //       var percentComplete = Math.round(evt.loaded * 100 / evt.total);
            //       console.log(percentComplete.toString() + '%');
            //     }
            //     else {
            //       console.log('无法计算');
            //     }
            // }
            // function uploadComplete(evt) {//上传成功回调函数
            //     /* 当服务器响应后，这个事件就会被触发 */
            //     console.log(evt.target.responseText);
            // }

            // function uploadFailed(evt) {//上传失败回调函数
            //     console.log("上传文件发生了错误尝试");
            // }

            // function uploadCanceled(evt) {//上传取消回调函数
            //     console.log("上传被用户取消或者浏览器断开连接");
            // }
            var input = document.getElementById('inputId');
            var formData = new FormData();
            formData.append(input.name, input.files[0]);
            var xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", process, false);
            xhr.addEventListener("load", success, false);
            xhr.addEventListener("error", fail, false);
            xhr.addEventListener("abort", cancel, false);
            xhr.open("POST", address);
            xhr.send(formData);
        };
        this.downloadFile = function(address){//下载文件 文件是地址型 兼容IE11 chrome 火狐 QQ浏览器
            var elemIF = document.createElement("iframe");
            elemIF.src = address;
            elemIF.style.display = "none";
            doc.body.appendChild(elemIF);
        };
        this.webSocketRecollect = function(url){//webSockt 通道  重连机制
            var _this = this.webSocketRecollect;
            _this.url = url;
            var ws = null;
            var connectLock = false;
            var reconnect = function() {
                if (!connectLock) {
                    // 2s才允许一次重连，在间隙禁止重连。
                    setTimeout(function() {
                        _this.connect(_this.url);
                        connectLock = false;
                    }, 2000);
                    connectLock = true;
                }
            };
            // 初始化ws诸事件, message时，如果是正常传输状态，会调用自定义回调msgCb; 第二个参数为true表示，无论readyState如何，message都会尝试调用msgCb
            _this.initEvent = function(msgCb, mustCall) {
                if (undefined != ws) {
                    var _ws = ws;
                    var runType = 'normal';
                    if ('function' != typeof msgCb) msgCb = function() {};
                    ws.onclose = function(ev) {
                        runType = 'closing';
                        reconnect();
                    };
                    ws.onerror = function(ev) {
                        runType = 'error';
                        reconnect();
                    };
                    ws.onopen = function(ev) {
                        runType = 'openning';
                    };
                    //如果获取到消息，心跳检测重置；拿到任何消息都说明当前连接是正常的
                    ws.onmessage = function(ev) {
                        if (mustCall || 'normal' == runType) {
                            msgCb.apply(_ws, [ev.data, _ws]);
                        } else {
                            // 特殊情况，目前只复原标志位就好
                            runType = 'normal';
                        }
                    };
                }
            };
            _this.connect = function(callback) {
                try {
                    ws = new WebSocket(_this.url);
                } catch (e) {
                    console.error(e);
                    reconnect();
                }
                _this.initEvent(callback);
            };
            return _this;
        };
        this.webSocket = function(url,msgCallBack){//webSockt连接 并有消息时回调
            var wsPass = this.webSocketRecollect(url);
            if (wsPass) {
                wsPass.connect(function(resp, ws) {
                    try {
                        resp = JSON.parse(resp);
                        if (msgCallBack && typeof msgCallBack == "function"){
                            msgCallBack.apply(ws, [resp, ws]);
                        }else{
                            console.error("webSocket msg回调不是函数");
                        }
                    } catch (e) {
                        console.error(e);
                    }
                });
            }
        };
        this.uploadBurst = function(address,extensions,size,id){//分片上传  地址  需要传入支持文件类型  分片大小(MB为单位)
            var fileUrl = "";
            var formsData = {};
            formsData.appendfilename = "";
            var uploader = WebUploader.create({
                disableGlobalDnd: true,
                auto: false, //是否自动上传
                pick: {
                    id: '#'+id,
                    name: "file", //这个地方 name 没什么用，虽然打开调试器，input的名字确实改过来了。但是提交到后台取不到文件。如果想自定义file的name属性，还是要和fileVal 配合使用。
                    label: '点击选择文件',
                    multiple: false //默认为true，true表示可以多选文件，HTML5的属性
                },
                accept: {
                title: 'File',
                extensions: extensions || "",
                mimeTypes: 'file/*'   //限制格式只能是zip
                },
                swf: './Uploader.swf', //在这里必需要引入swf文件，webuploader初始化要用
                //fileVal:'multiFile',  //自定义file的name属性，我用的版本是0.1.5 ,打开客户端调试器发现生成的input 的name 没改过来。
                //名字还是默认的file,但不是没用哦。虽然客户端名字没改变，但是提交到到后台，是要用multiFile 这个对象来取文件的，用file 是取不到文件的
                // 建议作者有时间把这个地方改改啊，搞死人了。。
                server: address,
                duplicate: true, //是否可重复选择同一文件
                resize: false,
                timeout: 10000,
                formData:formsData,
                compress: null, //图片不压缩
                chunked: true, //分片处理
                chunkSize: (size||5) * 1024 * 1024, //每片默认5M
                chunkRetry: false, //如果失败，则不重试
                threads: 1, //上传并发数。允许同时最大上传进程数。
                // runtimeOrder: 'flash',  
                // 禁掉全局的拖拽功能。这样不会出现图片拖进页面的时候，把图片打开。  
                disableGlobalDnd: true
            });
            // 当有文件读取到了的时候
            uploader.on("fileQueued", function(file) {
                console.log(file);
            });
            uploader.on('uploadBeforeSend', function(obj, data, headers) {
                data.appendfilename = formsData.appendfilename;
            });
            //当所有文件上传结束时触发all
            uploader.on("uploadFinished", function(file) {
                console.log("uploadFinished:");
                console.log(file);
            });
            //当某个文件上传到服务端响应后，会派送此事件来询问服务端响应是否有效。
            uploader.on("uploadAccept", function(object, ret) {
                //服务器响应了//ret._raw  类似于 data
                var data = JSON.parse(ret._raw);
                if (!data.code || data.code !="200") {
                    uploader.reset();
                    console.log("error");
                    return false;
                } else {//E05017
                    formsData.appendfilename = data.data[0];
                    return true;
                }
            });
            //当文件上传成功时触发。
            uploader.on("uploadSuccess", function(file) {
                console.log(formsData);
                systemFileAddress = formsData.appendfilename;
            });
            uploader.on("uploadError", function(file) {
                console.log("上传出错");
                uploader.cancelFile(file);
                uploader.removeFile(file, true);
                uploader.reset();
            });
            uploader.onError = function() {
                console.log({ title: "友情提示", desc: "文件只支持" + extensions + "格式！" });
            };
            // 文件上传过程中创建进度条实时显示。
            uploader.on( 'uploadProgress', function( file, percentage ) {
                var total = Number(file.size/(1000*1024)).toFixed(2);//大小
                var percents = Number(percentage*file.size/(1000*1024)).toFixed(2)//已传;
                console.log('上传中'+percents+"/"+total+"MB");
            });
            return uploader;
        };

        this.requestFullScreen = function(element) {
            // 判断各种浏览器，找到正确的方法
            var requestMethod = element.requestFullScreen || //W3C
                element.webkitRequestFullScreen || //Chrome等
                element.mozRequestFullScreen || //FireFox
                element.msRequestFullScreen; //IE11
            if (requestMethod) {
                requestMethod.call(element);
            } else if (typeof window.ActiveXObject !== "undefined") { //for Internet Explorer
                var wscript = new ActiveXObject("WScript.Shell");
                if (wscript !== null) {
                    wscript.SendKeys("{F11}");
                }
            }
        };

        this.getImageAjax = function(stationStore,stationId,checkPointId,taskId,imageType,bestEffort){//imageType:0为可见光1为红外
            var station =stationStore.filter(function(item){
                if(item.stationId == stationId){
                    return item;
                }
            })
            var stationIp = station[0].stationIp.substr(0,station[0].stationIp.indexOf(':'));
            var stationPort = station[0].stationIp.substr(station[0].stationIp.indexOf(':')+1);

            var params ='?params={"taskId":"'+taskId+'","checkpointId":"'+checkPointId+'","ip":"'+
                stationIp+'","port":"'+stationPort + '","stationId":"'+stationId +'"';
            if(imageType!==undefined && imageType!==''){
                params += ',"imageType":"'+imageType+'"';
            }
            if(bestEffort!==undefined && bestEffort!==''){
                params += ',"bestEffort":"'+bestEffort+'"';
            }
            params += '}';
            var encodedParams = encodeURI(params);
            var image = InterfaceUrl.queryResultPic+ encodedParams;

            return image;
        }
        this.imgErrHandler = function(isBig) {
            if(isBig){
                return './images/error-bigimg.png';
            }else{
                return './images/error-img.png';
            }
        };
    };

    w.myUitl = new myUitl();

})(window, document);
