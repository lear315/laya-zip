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

## [](https://www.npmjs.com/package/jszip#license)License

laya-zip is dual-licensed. You may use it under the MIT license *or* the GPLv3 license. 
