import {Logger,InitEvent, TickEvent, Player} from "../lib/index.js";
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import { animationConfFromFile, conf } from "./conf.js";
import { AnimatedTextConfig } from "./lib/display.js";

//开启渲染服务
const worker = new Worker(__filename.replace("index.js","textRender.js"), {workerData: {}});
class MotdLoop{
    private content:AnimatedTextConfig[]
    private frame:number=0
    private loop:NodeJS.Timeout
    constructor(){
        this.loop=setInterval(this.update,conf.get("freq"))
        const contentConfigFile:any[]=conf.get("content")
        const contentConf:AnimatedTextConfig[]=[]
        for(let fileContent of contentConfigFile){
            contentConf.push(animationConfFromFile(fileContent))
        }
        this.content=contentConf
    }
    update(){
        worker.postMessage({
            conf:this.content,
            frame:this.frame,
            vars:{}
        })
        this.frame++
    }
    destroy(){
        clearInterval(this.loop)
    }
}
//开启motd循环，命令重载配置文件会使该循环重启
let motdLoop=new MotdLoop()
//单个玩家的侧边栏渲染循环任务
class PlayerSidebarLoop{
    fps:number
    contents:AnimatedTextConfig[][]
    player:Player
    constructor(){
        
    }
}
TickEvent.on(e=>{
    //开启侧边栏循环
    //玩家修改侧边栏的动作会使该循环重启
    //每tick步进一次进行渲染
})