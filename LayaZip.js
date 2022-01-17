/*
 * Copyright (C) 2020 The laya-zip Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const JSZip = require('jszip');
class LayaZip {
    static DeBug = true;
    static ZIP = "ZIP";
    static ReferenceCount = 0;
    static PreLoadedMap = {};
    static BasePathMode = 0;
    static LazyMode = false;
    static LazyFliter = ["lh", "ls"];
    static Platform = "web";
    static Version = "1.0.7";
    static CacheZIPFile = true;
    static AutoSkipZip = true;
    static CacheZips = {};

    static get Ins() {
        if (!LayaZip._resLoader) {
            LayaZip._resLoader = new LayaZip();
        }
        return LayaZip._resLoader;
    }
    static Init() {
        LayaZip.Ins.init();
    }
    init() {
        LayaZip.Platform = LayaZip.getPlatform();
        Laya.Loader.parserMap[LayaZip.ZIP] = LayaZip.loadZipRes;
        LayaZip.PreLoadedMap = {};
        LayaZip.CacheZips = {};
        let rawLoaderOnLoaded = Laya.Loader.prototype["_loadHttpRequestWhat"];
        Laya.Loader.prototype["_loadHttpRequestWhat"] = function (url, contentType) {
            let curUrl = Laya.URL.formatURL(url);
            if (LayaZip.PreLoadedMap[curUrl]) {
                Laya.Loader.prototype["onLoaded"].call(this, LayaZip.PreLoadedMap[curUrl]);
            } else {
                rawLoaderOnLoaded.call(this, url, contentType);
            }
        };
        let rawLoadHtmlImage = Laya.Loader.prototype["_loadHtmlImage"];
        Laya.Loader.prototype["_loadHtmlImage"] = function (url, onLoadCaller, onLoad, onErrorCaller, onError) {
            if (LayaZip.PreLoadedMap[url]) {
                if (LayaZip.Platform == "web") {
                    LayaZip.createHtmlImageAsync(LayaZip.PreLoadedMap[url], url, onLoadCaller, onLoad, onErrorCaller, onError);
                } else {
                    let base64 = LayaZip.arrayBufferToBase64(url, LayaZip.PreLoadedMap[url]);
                    LayaZip.createHtmlImage(base64, url, onLoadCaller, onLoad, onErrorCaller, onError);
                }
            } else {
                rawLoadHtmlImage.call(this, url, onLoadCaller, onLoad, onErrorCaller, onError);
            }
        };
        let rawloadHttpRequest = Laya.Loader.prototype["_loadHttpRequest"];
        Laya.Loader.prototype["_loadHttpRequest"] = function (url, contentType, onLoadCaller, onLoad, onProcessCaller, onProcess, onErrorCaller, onError) {
            if (LayaZip.PreLoadedMap[url]) {
                Laya.Loader.prototype["onLoaded"].call(this, LayaZip.PreLoadedMap[url]);
            } else {
                rawloadHttpRequest.call(this, url, contentType, onLoadCaller, onLoad, onProcessCaller, onProcess, onErrorCaller, onError);
            }
        };

        let rawWebAudioLoad = Laya.WebAudioSound.prototype["load"];
        Laya.WebAudioSound.prototype["load"] = function (url) {
            if (LayaZip.PreLoadedMap[url]) {
                LayaZip.webAudioLoad.call(this, url);
            } else {
                rawWebAudioLoad.call(this, url);
            }
        };
        let rawAudioSoundLoad = Laya.AudioSound.prototype["load"];
        Laya.AudioSound.prototype["load"] = function (url) {
            if (LayaZip.PreLoadedMap[url]) {
                LayaZip.AudioSoundLoad.call(this, url);
            } else {
                rawAudioSoundLoad.call(this, url);
            }
        };
        let rawttfloadConch = Laya.TTFLoader.prototype["_loadConch"];
        Laya.TTFLoader.prototype["_loadConch"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], {
                    type: "font/ttf"
                });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawttfloadConch.call(this);
            } else {
                rawttfloadConch.call(this);
            }
        };
        let rawloadWithFontFace = Laya.TTFLoader.prototype["_loadWithFontFace"];
        Laya.TTFLoader.prototype["_loadWithFontFace"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], {
                    type: "font/ttf"
                });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawloadWithFontFace.call(this);
            } else {
                rawloadWithFontFace.call(this);
            }
        };
        let rawloadWithCSS = Laya.TTFLoader.prototype["_loadWithCSS"];
        Laya.TTFLoader.prototype["_loadWithCSS"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], {
                    type: "font/ttf"
                });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawloadWithCSS.call(this);
            } else {
                rawloadWithCSS.call(this);
            }
        };

        LayaZip.initByPlatform();

        if (LayaZip.AutoSkipZip) {
            // 开启自动跳过ZIP
            let rawClearRes = Laya.Loader.clearRes;
            Laya.Loader.clearRes = function (url) {
                rawClearRes.call(this, url);
                LayaZip.clearZipRes(url);
            };
        }
    }
    static initByPlatform() {
        if (LayaZip.Platform != "web") {

            let rawTransformImgUrl = Laya.MiniLoader["_transformImgUrl"];
            Laya.MiniLoader["_transformImgUrl"] = function (url, type, thisLoader) {
                let curUrl = Laya.URL.formatURL(url);
                if (LayaZip.PreLoadedMap[curUrl]) {
                    thisLoader._loadImage(url);
                } else {
                    rawTransformImgUrl.call(this, url, type, thisLoader);
                }
            };

            Laya.MiniLoader["onCreateZip"] = function (sourceUrl, thisLoader, isLocal = false, tempFilePath = "") {
                let fileNativeUrl;
                if (LayaZip.CacheZIPFile) {
                    if (!isLocal) {
                        if (tempFilePath != "") {
                            fileNativeUrl = tempFilePath;
                        }
                        else {
                            let fileObj = Laya.MiniFileMgr.getFileInfo(Laya.URL.formatURL(sourceUrl));
                            fileNativeUrl = fileObj.tempFilePath || Laya.MiniFileMgr.getFileNativePath(fileObj.md5);
                        }
                    }
                    else {
                        fileNativeUrl = sourceUrl;
                    }
                }
                else {
                    if (!isLocal) {
                        fileNativeUrl = tempFilePath;
                    } else {
                        fileNativeUrl = sourceUrl;
                    } 
                }
                Laya.MiniFileMgr.readFileAB(fileNativeUrl, new Laya.Handler(Laya.MiniLoader, Laya.MiniLoader.onReadNativeCallBack, [fileNativeUrl, Laya.Loader.BUFFER, thisLoader]));
            };
            Laya.MiniFileMgr["readFileAB"] = function (filePath, callBack = null, readyUrl = "", isSaveFile = false, fileType = "", isAutoClear = true) {
                filePath = Laya.URL.getAdptedFilePath(filePath);
                Laya.MiniFileMgr.fs.readFile({ filePath: filePath, success: function (data) {
                        callBack != null && callBack.runWith([0, data]);
                    }, fail: function (data) {
                        if (data) {
                            callBack != null && callBack.runWith([1, data]);
                        }
                }});
            };

            Laya.MiniLoader["onDownZipCallBack"] = function (sourceUrl, thisLoader, errorCode, tempFilePath = "") {
                if (!errorCode) {
                    Laya.MiniLoader.onCreateZip(sourceUrl, thisLoader, false, tempFilePath);
                } else {
                    thisLoader.onError(null);
                }
            };

            let rawLoadResource = Laya.Loader.prototype["_loadResource"];
            Laya.Loader.prototype["_loadResource"] = function (type, url) {
                let curType = LayaZip.getTypeFromUrl(url);
                if (curType == LayaZip.ZIP) {
                    LayaZip.transformZipUrl.call(this, url);
                } else {
                    rawLoadResource.call(this, type, url);
                }
            };
        }
    }

    static clearZipRes(url) {
        if (!url) {
            return;
        }
        for(let i in LayaZip.CacheZips) {
            let cache = LayaZip.CacheZips[i];
            if (cache.loadedState && cache.loadedArray.indexOf(url) > -1) {
                cache.loadedArray = [];
                delete LayaZip.CacheZips[i];
            }
        }
    }

    static transformZipUrl(url) {
        if (!LayaZip.CacheZIPFile) {
            this._loadHttpRequestWhat(url);
        }
        else {
            let tempUrl = Laya.URL.formatURL(url);
            if (!Laya.MiniFileMgr.isLocalNativeFile(url) && !Laya.MiniFileMgr.getFileInfo(tempUrl)) {
                if (Laya.MiniFileMgr.isNetFile(tempUrl)) {
                    Laya.MiniFileMgr.downOtherFiles(tempUrl, new Laya.Handler(Laya.MiniLoader, Laya.MiniLoader.onDownZipCallBack, [url, this]), tempUrl);
                }
                else {
                    Laya.MiniLoader.onCreateZip(url, this, true);
                }
            }
            else {
                Laya.MiniLoader.onCreateZip(url, this);
            }
        }
    }

    static webAudioLoad(url) {
        url = Laya.URL.formatURL(url);
        this.url = url;

        this.audioBuffer = Laya.WebAudioSound._dataCache[url];
        if (this.audioBuffer) {
            this._loaded(this.audioBuffer);
            return;
        }
        Laya.WebAudioSound.e.on("loaded:" + url, this, this._loaded);
        Laya.WebAudioSound.e.on("err:" + url, this, this._err);
        if (Laya.WebAudioSound.__loadingSound[url]) {
            return;
        }
        Laya.WebAudioSound.__loadingSound[url] = true;

        if (this._disposed) {
            this._removeLoadEvents();
            return;
        }
        this.data = LayaZip.PreLoadedMap[url];
        Laya.WebAudioSound.buffs.push({ "buffer": this.data, "url": this.url });
        Laya.WebAudioSound.decode();
    }
    static AudioSoundLoad(url) {
        url = Laya.URL.formatURL(url);

        this.url = url;
        var ad;
        if (url == Laya.SoundManager._bgMusic) {
            Laya.AudioSound._initMusicAudio();
            ad = Laya.AudioSound._musicAudio;
            if (ad.src != url) {
                delete Laya.AudioSound._audioCache[ad.src];
                ad = null;
            }
        } else {
            ad = Laya.AudioSound._audioCache[url];
        }
        if (ad && ad.readyState >= 2) {-
            this.event(Laya.Event.COMPLETE);
            return;
        }
        if (!ad) {
            if (url == Laya.SoundManager._bgMusic) {
                Laya.AudioSound._initMusicAudio();
                ad = Laya.AudioSound._musicAudio;
            } else {
                ad = Laya.Browser.createElement("audio");
            }
            Laya.AudioSound._audioCache[url] = ad;
            let base64 = LayaZip.arrayBufferToBase64(url, LayaZip.PreLoadedMap[url]);
            ad.src = base64;
        }
        ad.addEventListener("canplaythrough", onLoaded);
        ad.addEventListener("error", onErr);
        var me = this;
        function onLoaded() {
            offs();
            me.loaded = true;
            Laya.Loader.cacheRes(url, me);
            me.event(Laya.Event.COMPLETE);
        }

        function onErr() {
            ad.load = null;
            offs();
            me.event(Laya.Event.ERROR);
        }

        function offs() {
            ad.removeEventListener("canplaythrough", onLoaded);
            ad.removeEventListener("error", onErr);
        }

        this.audio = ad;
        if (ad.load) {
            ad.load();
        } else {
            onErr();
        }
    }
    static createHtmlImageAsync(arrayBuffer, url, onLoadCaller, onLoad, onErrorCaller, onError) {
        let image;
        function clear() {
            var img = image;
            img.onload = null;
            img.onerror = null;
            delete Laya.Loader["_imgCache"][url];
        }
        var onerror = function () {
            clear();
            onError.call(onErrorCaller);
        };
        var onload = function () {
            clear();
            onLoad.call(onLoadCaller, image);
        };
        image = new Laya.Browser.window.Image();
        image.crossOrigin = "";
        image.onload = onload;
        image.onerror = onerror;
        let blob = new Blob([arrayBuffer]);
        let fileReader = new FileReader();
        fileReader.onload = function (data) {
            image.src = data.target.result;
            Laya.Loader["_imgCache"] = image;
        };
        fileReader.readAsDataURL(blob);
    }

    static createHtmlImage(base64, url, onLoadCaller, onLoad, onErrorCaller, onError)
    {
        let image;
        function clear() {
            var img = image;
            img.onload = null;
            img.onerror = null;
            delete Laya.Loader["_imgCache"][url];
        }
        var onerror = function () {
            clear();
            onError.call(onErrorCaller);
        };

        var onload = function () {
            clear();
            onLoad.call(onLoadCaller, image);
        };
        image = new Laya.Browser.window.Image();
        image.crossOrigin = "";
        image.onload = onload;
        image.onerror = onerror;
        image.src = base64;
        Laya.Loader._imgCache[url] = image;//增加引用，防止垃圾回收
    }

    static arrayBufferToBase64(url, arrayBuffer)
    {
        let ext = Laya.Utils.getFileExtension(url);
        let prefix;
        switch (ext) {
            case "png":
                prefix = "data:image/png;base64,";
                break;
            case "gif":
                prefix = "data:image/png;base64,";
                break;
            case "jpg":
            case "jpeg":
            case "bmp":
                prefix = "data:image/jpeg;base64,";
                break;
            case "icon":
                prefix = "data:image/x-icon;base64,";
                break;
            case "icon":
                prefix = "data:image/x-icon;base64,";
                break;
            case "mp3":
                prefix = "data:audio/x-wav;base64,";
                break;
            case "wav":
            case "ogg":
                prefix = "data:audio/wav;base64,";
                break;
            default:
                prefix = "data:image/jpeg;base64,";
                break;
        }
        let binary = '';
        let bytes = new Uint8Array( arrayBuffer );
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
        }
        let base64String = LayaZip.btoa(binary);
        return (prefix + base64String);
    }

    static btoa(str) {
        var c1, c2, c3;
        var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var i = 0, len = str.length, string = '';
        
        while (i < len) {
            c1 = str.charCodeAt(i++) & 0xff;
            if (i == len) {
            string += base64EncodeChars.charAt(c1 >> 2);
            string += base64EncodeChars.charAt((c1 & 0x3) << 4);
            string += "==";
            break;
            }
            c2 = str.charCodeAt(i++);
            if (i == len) {
            string += base64EncodeChars.charAt(c1 >> 2);
            string += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            string += base64EncodeChars.charAt((c2 & 0xF) << 2);
            string += "=";
            break;
            }
            c3 = str.charCodeAt(i++);
            string += base64EncodeChars.charAt(c1 >> 2);
            string += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            string += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
            string += base64EncodeChars.charAt(c3 & 0x3F)
        }
        return string
    }

    static loadZipRes(loader) {
        if (LayaZip.AutoSkipZip) {
            // 自动跳过已加载
            if (LayaZip.CacheZips[loader.url] && LayaZip.CacheZips[loader.url].loadedState) {
                LayaZip.log("===== AutoSkipZip ", loader.url);
                Laya3D["_endLoad"](loader, new Laya.Resource());
                return;
            }
        }

        if (LayaZip.ReferenceCount == 0) {
            LayaZip.PreLoadedMap = {};
        }
        LayaZip.ReferenceCount += 1;

        loader["BaseFileUrls"] = [];
        loader["ParseZipDataCount"] = 0;
        loader['_originType'] = loader.type;
        loader.on(Laya.Event.LOADED, null, LayaZip.onZipLoaded, [loader]);
        loader.load(loader.url, Laya.Loader.BUFFER, false, null, true);
        LayaZip.logTime("===== Download Zip Timecost", loader.url);
        LayaZip.logTime("===== Load Zip Total Timecost", loader.url);
    }
    static onZipLoaded(loader, zipData) {
        LayaZip.logTime("===== Download Zip Timecost", loader.url, true);
        LayaZip.logTime("===== UnZip Dir Timecost", loader.url);

        var loadBasePath = "";
        var curUrl = loader.url;
        if (LayaZip.BasePathMode == 0) {
            // 使用压缩包路径作为解析基础路径(带文件夹)
            var lastIndex = curUrl.lastIndexOf(".");
            loadBasePath = curUrl.slice(0, lastIndex) + "/";
        } else if (LayaZip.BasePathMode == 1) {
            // 使用压缩包路径作为解析基础路径(不带文件夹)
            var lastIndex = curUrl.lastIndexOf("/");
            loadBasePath = curUrl.slice(0, lastIndex) + "/";
        } else if (LayaZip.BasePathMode == 2) {
            // 使用根路径作为解析基础路径
            loadBasePath = "";
        }

        if (LayaZip.AutoSkipZip) {
            // 开启加载跳过
            if (LayaZip.CacheZips[loader.url] == undefined) {
                LayaZip.CacheZips[loader.url] = {};
                LayaZip.CacheZips[loader.url].loadedState = false;
                LayaZip.CacheZips[loader.url].loadedArray = [];
            }
        }

        JSZip.loadAsync(zipData, null).then(function (zip) {
            zip.forEach(function (rawPath, file) {
                let relativePath = loadBasePath + rawPath;
                let relativePathUse = true;
                if (!file.dir) {
                    let constructParams = loader["_constructParams"];
                    let propertyParams = loader["_propertyParams"];

                    if (relativePathUse && LayaZip.LazyMode == true && relativePath) {
                        let ext = (Laya.LoaderManager.createMap[Laya.Utils.getFilecompatibleExtension(rawPath)])?Laya.Utils.getFilecompatibleExtension(rawPath):Laya.Utils.getFileExtension(rawPath);
                        if (LayaZip.LazyFliter && LayaZip.LazyFliter.length) {
                            if (LayaZip.LazyFliter.indexOf(ext) > -1) {
                                loader["BaseFileUrls"].push(relativePath);
                                relativePathUse = false;
                            }
                        }
                    } 
                    if (relativePathUse && constructParams && constructParams.length) {
                        // 加载配置的指定文件
                        if (constructParams.indexOf(rawPath) > -1) {
                            loader["BaseFileUrls"].push(relativePath);
                            relativePathUse = false;
                        }
                    }
                    if (relativePathUse && propertyParams && propertyParams.length) {
                        // 加载配置的指定目录下的文件
                        for (let i = 0; i < propertyParams.length; i++) {
                            let fliterDir = propertyParams[i];
                            let lastIndex = rawPath.indexOf(fliterDir);
                            if (lastIndex > -1) {
                                let loadPath = rawPath.replace(fliterDir, "");
                                if (loadPath.indexOf("/") == -1) {
                                    loader["BaseFileUrls"].push(relativePath);
                                    relativePathUse = false;
                                    break;
                                }
                            }
                        }
                    } 
                    
                    if (relativePathUse && rawPath.indexOf("/") == -1) {
                        loader["BaseFileUrls"].push(relativePath);
                        relativePathUse = false;
                    }
                    loader["ParseZipDataCount"] += 1;
                    LayaZip.parseZipData(relativePath, file, loader);
                }
            });
        });
    }

    static checkParseZipComplete(loader) {
        loader["ParseZipDataCount"] -= 1;
        if (loader["ParseZipDataCount"] <= 0) {
            loader["ParseZipDataCount"] = 0;
            LayaZip.loadUnZipRes(loader, loader["BaseFileUrls"]);
            LayaZip.logTime("===== UnZip Dir Timecost", loader.url, true);
        }
    }
    static parseZipData(relativePath, file, loader) {
        if (LayaZip.AutoSkipZip) {
            // 记录解析文件
            if (LayaZip.CacheZips[loader.url]) {
                LayaZip.CacheZips[loader.url].loadedArray.push(relativePath);
            }
        }
        let url = Laya.URL.formatURL(relativePath);
        let type = LayaZip.getTypeFromUrl(url);
        switch (type) {
            case Laya3D.HIERARCHY:
            case Laya3D.MATERIAL:
            case Laya3D.JSON:
                file.async("string").then((content) => {
                    LayaZip.PreLoadedMap[url] = JSON.parse(content);
                    LayaZip.checkParseZipComplete(loader);
                });
                break;
            default:
                file.async("arraybuffer").then((content) => {
                    LayaZip.PreLoadedMap[url] = content;
                    LayaZip.checkParseZipComplete(loader);
                });
                break;
        }
    }
    static loadUnZipRes(loader, fileUrls) {
        let infoUrls = [];
        for (let i = 0; i < fileUrls.length; i++) {
            let url = fileUrls[i];
            let type = LayaZip.getTypeFromUrl(url);
            infoUrls.push({
                url,
                type
            });
        }

        function onProgress(value) {
            Laya3D["_onProcessChange"](loader, 0, value, 1.0);
        }

        function onComplete() {
            LayaZip.ReferenceCount -= 1;
            if (LayaZip.ReferenceCount <= 0) {
                LayaZip.ReferenceCount = 0;
                LayaZip.PreLoadedMap = {};
            }
            LayaZip.logTime("===== Parse Files Timecost Count", infoUrls.length + " ", true);
            LayaZip.logTime("===== Load Zip Total Timecost", loader.url, true);

            if (LayaZip.AutoSkipZip) {
                if (LayaZip.CacheZips[loader.url]) {
                    LayaZip.CacheZips[loader.url].loadedState = true;
                }
            }

            fileUrls = [];
            completeHandler = null;
            progressHandler = null;
            Laya3D["_endLoad"](loader, new Laya.Resource());
        }
        let completeHandler = Laya.Handler.create(this, onComplete);
        let progressHandler = Laya.Handler.create(this, onProgress);
        if (infoUrls.length <= 0) {
            onComplete.call(this);
            return;
        }
        LayaZip.logTime("===== Parse Files Timecost Count", infoUrls.length + " ");
        Laya.loader.create(infoUrls, completeHandler, progressHandler);
    }
    static logTime(name, filename, finish) {
        if (LayaZip.DeBug) {
            if (finish) {
                console.timeEnd(name + " " + filename + " ");
            } else {
                console.time(name + " " + filename + " ");
            }
        }
    }
    static log(str, filename) {
        if (LayaZip.DeBug) {
            console.log(str + " " + filename);
        }
    }
    static getTypeFromUrl(url) {
        let type = Laya.Loader.getTypeFromUrl(url);
        if (!type) {
            let ext = (Laya.LoaderManager.createMap[Laya.Utils.getFilecompatibleExtension(url)])?Laya.Utils.getFilecompatibleExtension(url):Laya.Utils.getFileExtension(url);
            switch (ext) {
                case "lh":
                case "ls":
                    type = Laya.Loader.HIERARCHY;
                    break;
                case "lm":
                    type = Laya.Loader.MESH;
                    break;
                case "lmat":
                    type = Laya.Loader.MATERIAL;
                    break;
                case "ltc":
                    type = Laya.Loader.TEXTURECUBE;
                    break;
                case "jpg":
                case "jpeg":
                case "bmp":
                case "gif":
                case "png":
                case "dds":
                case "ktx":
                case "pvr":
                    type = Laya.Loader.TEXTURE2D;
                    break;
                case "lani":
                    type = Laya.Loader.ANIMATIONCLIP;
                    break;
                case "lav":
                    type = Laya.Loader.AVATAR;
                    break;
                case "ltc":
                    type = Laya.Loader.TEXTURECUBE;
                    break;
                case "ltcb":
                    type = Laya3D.TEXTURECUBEBIN;
                    break;
                case "thdata":
                    type = Laya.Loader.TERRAINHEIGHTDATA;
                    break;
                case "zip":
                    type = LayaZip.ZIP;
                    break;
                case "ltcb.ls":
                    type = Laya3D.TEXTURECUBEBIN;
                    break;
                case "lanit.ls":
                    type = Laya.Loader.TEXTURE2D;
                    break;
                case "json":
                case "JSON":   
                    type = Laya.Loader.JSON;
                    break;
                default:
                    type = Laya.Loader.BUFFER;
                    break;
            }
        }
        return type;
    }

    static clearCacheZip(url) {
        if (url) {
            if (LayaZip.CacheZips[url]) {
                LayaZip.CacheZips[url].loadedArray = [];
                delete LayaZip.CacheZips[url];
            }
        } else {
            LayaZip.CacheZips = {};
        }
    }

    static getPlatform() {
        let type = "web";
        if (Laya.MiniAdpter && Laya.MiniAdpter._inited) {
            // 微信
            type = "wx";
        } else if (Laya.QQMiniAdapter && Laya.QQMiniAdapter._inited) {
            // QQ
            type = "qq";
        } else if (Laya.TTMiniAdapter && Laya.TTMiniAdapter._inited) {
            // 头条
            type = "tt";
        } else if (Laya.BLMiniAdapter && Laya.BLMiniAdapter._inited) {
            // 哔哩哔哩
            type = "bl";
        } else if (Laya.BMiniAdapter && Laya.BMiniAdapter._inited) {
            // 百度
            type = "bd";
        } else if (Laya.KGMiniAdapter && Laya.KGMiniAdapter._inited) {
            // 小米
            type = "xm";
        } else if (Laya.QGMiniAdapter && Laya.QGMiniAdapter._inited) {
            // oppo
            type = "op";
        } else if (Laya.VVMiniAdapter && Laya.VVMiniAdapter._inited) {
            // VIVO
            type = "vv";
        } else if (Laya.HWMiniAdapter && Laya.HWMiniAdapter._inited) {
            // 华为
            type = "hw";
        } else if (Laya.ALIMiniAdapter && Laya.ALIMiniAdapter._inited) {
            // 阿里
            type = "al";
        } else if (Laya.TBMiniAdapter && Laya.TBMiniAdapter._inited) {
            // 淘宝
            type = "tb";
        }
        return type;
    }
}

//# sourceMappingURL=LayaZip.js.map
exports.LayaZip = LayaZip;
exports.default = LayaZip;