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
        Laya.Loader.parserMap[LayaZip.ZIP] = LayaZip.loadZipRes;
        LayaZip.PreLoadedMap = {};
        // AOP切面
        let rawLoaderOnLoaded = Laya.Loader.prototype["_loadHttpRequestWhat"];
        Laya.Loader.prototype["_loadHttpRequestWhat"] = function (url, contentType) {
            if (LayaZip.PreLoadedMap[url]) {
                Laya.Loader.prototype["onLoaded"].call(this, LayaZip.PreLoadedMap[url]);
            }
            else {
                rawLoaderOnLoaded.call(this, url, contentType);
            }
        };
        let rawLoadHtmlImage = Laya.Loader.prototype["_loadHtmlImage"];
        Laya.Loader.prototype["_loadHtmlImage"] = function (url, onLoadCaller, onLoad, onErrorCaller, onError) {
            if (LayaZip.PreLoadedMap[url]) {
                LayaZip.createHtmlImageAsync(LayaZip.PreLoadedMap[url], url, onLoadCaller, onLoad, onErrorCaller, onError);
            }
            else {
                rawLoadHtmlImage.call(this, url, onLoadCaller, onLoad, onErrorCaller, onError);
            }
        };
        let rawloadHttpRequest = Laya.Loader.prototype["_loadHttpRequest"];
        Laya.Loader.prototype["_loadHttpRequest"] = function (url, contentType, onLoadCaller, onLoad, onProcessCaller, onProcess, onErrorCaller, onError) {
            if (LayaZip.PreLoadedMap[url]) {
                Laya.Loader.prototype["onLoaded"].call(this, LayaZip.PreLoadedMap[url]);
            }
            else {
                rawloadHttpRequest.call(this, url, contentType, onLoadCaller, onLoad, onProcessCaller, onProcess, onErrorCaller, onError);
            }
        };
        let rawloadSound = Laya.Loader.prototype["_loadSound"];
        Laya.Loader.prototype["_loadSound"] = function (url) {
            if (LayaZip.PreLoadedMap[url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[url]], { type: "autio/wave" });
                let transUrl = URL.createObjectURL(blob);
                rawloadSound.call(this, transUrl);
            }
            else {
                rawloadSound.call(this, url);
            }
        };
        let rawttfloadConch = Laya.TTFLoader.prototype["_loadConch"];
        Laya.TTFLoader.prototype["_loadConch"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], { type: "font/ttf" });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawttfloadConch.call(this);
            }
            else {
                rawttfloadConch.call(this);
            }
        };
        let rawloadWithFontFace = Laya.TTFLoader.prototype["_loadWithFontFace"];
        Laya.TTFLoader.prototype["_loadWithFontFace"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], { type: "font/ttf" });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawloadWithFontFace.call(this);
            }
            else {
                rawloadWithFontFace.call(this);
            }
        };
        let rawloadWithCSS = Laya.TTFLoader.prototype["_loadWithCSS"];
        Laya.TTFLoader.prototype["_loadWithCSS"] = function () {
            if (LayaZip.PreLoadedMap[this._url]) {
                let blob = new Blob([LayaZip.PreLoadedMap[this._url]], { type: "font/ttf" });
                let transUrl = URL.createObjectURL(blob);
                this._url = transUrl;
                rawloadWithCSS.call(this);
            }
            else {
                rawloadWithCSS.call(this);
            }
        };
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
            Laya.Loader["_imgCache"] = image; //增加引用，防止垃圾回收
        };
        fileReader.readAsDataURL(blob);
    }
    static loadZipRes(loader) {
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
        // 基础加载文件
        LayaZip.logTime("===== Download Zip Timecost", loader.url, true);
        LayaZip.logTime("===== UnZip Dir Timecost", loader.url);
        JSZip.loadAsync(zipData, null).then(function (zip) {
            zip.forEach(function (relativePath, file) {
                if (!file.dir) {
                    let cp = loader["_constructParams"];
                    if (cp && cp.length) {
                        // 如果有指定加载
                        if (cp.indexOf(relativePath) > -1) {
                            loader["BaseFileUrls"].push(relativePath);
                        }
                    }
                    else {
                        if (relativePath.indexOf("/") == -1) {
                            loader["BaseFileUrls"].push(relativePath);
                        }
                    }
                    loader["ParseZipDataCount"] += 1;
                    LayaZip.parseZipData(relativePath, file, loader);
                }
            });
        });
    }
    // 判定是否加载完zip数据
    static checkParseZipComplete(loader) {
        loader["ParseZipDataCount"] -= 1;
        if (loader["ParseZipDataCount"] <= 0) {
            loader["ParseZipDataCount"] = 0;
            LayaZip.loadUnZipRes(loader, loader["BaseFileUrls"]);
            LayaZip.logTime("===== UnZip Dir Timecost", loader.url, true);
        }
    }
    static parseZipData(relativePath, file, loader) {
        let url = Laya.URL.formatURL(relativePath);
        let type = LayaZip.getTypeFromUrl(url);
        switch (type) {
            case Laya3D.HIERARCHY:
            case Laya3D.MATERIAL:
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
            infoUrls.push({ url, type });
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
            }
            else {
                console.time(name + " " + filename + " ");
            }
        }
    }
    static getTypeFromUrl(url) {
        let type = Laya.Loader.getTypeFromUrl(url);
        if (!type) {
            let ext = Laya.Utils.getFileExtension(url);
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
                case "bmp":
                case "gif":
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
                case "thdata":
                    type = Laya.Loader.TERRAINHEIGHTDATA;
                    break;
                case "zip":
                    type = LayaZip.ZIP;
                    break;
                default:
                    type = Laya.Loader.BUFFER;
                    break;
            }
        }
        return type;
    }
}
LayaZip.DeBug = true;
LayaZip.ZIP = "ZIP";
LayaZip.ReferenceCount = 0;
LayaZip.PreLoadedMap = {};
//# sourceMappingURL=LayaZip.js.map
exports.LayaZip = LayaZip;
exports.default = LayaZip;