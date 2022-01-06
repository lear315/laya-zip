A library for load zip resourse with laya engine, with a lovely and simple API.
See <https://womenzhai.cn/project> for all the documentation.
``` js
// Please initialize before use
import { LayaZip} from "laya-zip";

LayaZip.Init();

// Use ZIP when loading files
// Note By convention, only resource files in the level-1 directory are loaded
 Laya.loader.create([{ url: "xx.zip", type:"ZIP"}])
 
// Loads the file at the specified path and uses it
Laya.loader.create([{ url: "xx.zip", type:"ZIP",constructParams:["xx/xxx1.lh","xx/xxx2.lh"]}], Laya.Handler.create(this, () => {
     let player1 = Laya.loader.getRes("xx/xxx1.lh").clone();
     let player2 = Laya.loader.getRes("xx/xxx2.lh").clone();
}));

// Turn off time-consuming printing
LayaZip.DeBug = false

```


## 前言
laya-zip是一个用于laya引擎加载zip资源的扩展包，提供了友好和简单的API接口。与[LayaTree](https://womenzhai.cn/articleDetail?article_id=5f6afd44029db26f911a803d)一样，都使用Big AOP大切面理论进行设计，能够让游戏的加载速度提升350%。

## 效果
资源包体资源大小8.4M，压缩包体4.3MB情况下,:

使用laya-zip下加载多个资源的耗时784毫秒

![2021.12.27_李铒&fd137d54027c37cc30ceed3c4532ecf7.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7b1908f0c73b4949be82e790f15c5ffe~tplv-k3u1fbpfcp-watermark.image?)

使用普通资源加载耗时2798毫秒

![2021.12.27_李铒&313c77af21c373d041497bebe5a00317.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4dd6ffc7a3824c1b958ab39efb7085d8~tplv-k3u1fbpfcp-watermark.image?)

## 使用方法一
普通项目的使用方法，下载扩展包[laya-zip](https://womenzhai.cn/laya-zip_1.0.5.zip)

解压后，将**laya-zip.js**文件放入项目**bin/libs**/文件夹下，将**laya-zip.d.ts**文件放入项目**libs**/文件夹下，在**bin/index.js**文件中加载bundle.js前加入一行：
```
loadLib("libs/laya-zip.js")
```

在Main.ts中Laya初始化后加入：
```javascript
LayaZip.Init();
```

## 使用方法二
项目支持npm包增量编译的，使用npm安装方式比较好。（比如[这种编译方案](https://womenzhai.cn/articleDetail?article_id=5f52ffb0029db26f911a802d)）

安装[laya-zip](https://www.npmjs.com/package/laya-zip)
```javascript
npm i laya-zip
```

在Main.ts中Laya初始化后加入
```javascript
import { LayaZip} from "laya-zip";

LayaZip.Init();
```

## 加载
将所需资源压缩成zip（需要确认的一点是，压缩的zip中**目录结构**不要多包一层，切记）

根据约定，在**默认情况下只会加载**zip包**一级目录下**的所有资源（如模型、场景、图片、字体、声音等）。

![2021.12.27_李铒&7347549774a3df39a9b8b7d4717824a9.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a492ddbd9dc6411ea4ae49e26efbc6b3~tplv-k3u1fbpfcp-watermark.image?)

如上述的压缩包放置路径为bin目录下的：res/3d/Player.zip,则使用方法为

```javascript
Laya.loader.create([{ url: "res/3d/Player.zip", type: LayaZip.ZIP}])
```

加载资源使用:

```javascript
let player1 = Laya.loader.getRes("res/3d/Player/AngelMale01.lh").clone();
```


## 高级

### 加载选项(指定文件)
如果只需要加载zip包中的**部分资源**，或者资源路径在**多级目录**下。可以在**constructParams中进行配置**，来加载指定文件资源，其中配置的路径为**压缩包内的相对路径**。

```javascript
Laya.loader.create([{ url: "res/3d/Player.zip", type: LayaZip.ZIP, constructParams:["Folder1/Player1.lh","Folder2/Player2.lh"]}], 
    Laya.Handler.create(this, () => {
         let player1 = Laya.loader.getRes("res/3d/Player/Folder1/Player1.lh").clone();
         let player2 = Laya.loader.getRes("res/3d/Player/Folder2/Player2.lh").clone();
}));
```

### 加载选项(指定目录)
如果需要加载zip包中的指定目录下的资源。可以在**propertyParams中进行配置**，来加载指定目录下的所有资源（**仅在该目录,不会递归到其子目录**），其中配置的路径为**压缩包内的相对路径**，并且**以/结尾**。

```javascript
Laya.loader.create([{ url: "res/3d/Player.zip", type: LayaZip.ZIP, propertyParams:["Folder1/"]}],
    Laya.Handler.create(this, () => {
        let player1 = Laya.loader.getRes("res/3d/Player/Folder1/Player1.lh").clone();
        let player2 = Laya.loader.getRes("res/3d/Player/Folder1/Player2.lh").clone();
}));
```

### 加载选项(懒人模式)
懒人加载模式默认关闭。如果不想在加载时配置指定资源，可以**全局**开启懒人加载模式.

```javascript
LayaZip.LazyMode = false;
```

开启懒人加载模式后，会自动加载**压缩包下所有的.lh和.ls类型**资源，**无论**它们是在一级目录还是多级目录下面。

如果你想指定懒人加载的类型，那么你还可以自己进行修改：
```javascript
// 默认值
LayaZip.LazyFliter = ["lh", "ls"];
```

### 解压基础路径
压缩包会默认解析到其所在的相对路径下，但有时候你并不想要这么做，为此我提供了解压基础路径模式的配置

```javascript
// 默认值
LayaZip.BasePathMode = 0;
```
如res/3d/Player.zip压缩包解析后，其一级目录下的Player1.lh加载路径在不同模式下：

- 模式0
解析到其所在的相对路径下

```
Laya.loader.getRes("res/3d/Player/Player1.lh")
```
- 模式1
解析到其所在的相对路径的同级目录下:
```
Laya.loader.getRes("res/3d/Player1.lh")
```

- 模式2

解析到根目录下:
```
Laya.loader.getRes("Player1.lh")
```


### 调试
为了根据具体项目来定制压缩包的颗粒度（打几个包，资源怎么分包），laya-zip提供了调试模式，默认会在控制台打印各个阶段的耗时。

![2021.12.27_李铒&328241057e1b2b5e4798d73d54bf3470.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13a77787c81c4ff8bdcb74a1f1025805~tplv-k3u1fbpfcp-watermark.image?)
其中
- Download ZIP： 下载zip包的耗时
- UnZip Dir： 解压zip包目录结构的耗时
- Parse Files： 解压zip包的文件总个数和耗时
- Load Zip Total：从压缩包下载前到资源加载完毕后的总耗时

如果需要关闭调试可以：
```javascript
// Turn off time-consuming printing
LayaZip.DeBug = false
```

## 其他
如果有意见或建议，请反馈到：

QQ群： 200482074


![2021.12.27_李铒&885b16c8820065872f1a13a62d793f1a.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aba1dcc702154508b4fb75c77ec374e9~tplv-k3u1fbpfcp-watermark.image?)


## [](https://www.npmjs.com/package/jszip#license)License

laya-zip is dual-licensed. You may use it under the MIT license *or* the GPLv3 license. 
