import {Logger,InitEvent, TickEvent, Player} from "../lib/index.js";
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import { animationConfFromFile, conf, motdConf } from "./conf.js";
import { AnimatedTextConfig } from "./lib/display.js";

//开启渲染服务
const worker = new Worker(__filename.replace("index.js","textRenderer.js"), {workerData: {}});
class MotdLoop{
    private content:AnimatedTextConfig[]
    private frame:number=0
    private loop:NodeJS.Timeout
    constructor(){
        const contentConfigFile:any[]=motdConf.get("content")
        const contentConf:AnimatedTextConfig[]=[]
        for(let fileContent of contentConfigFile){
            contentConf.push(animationConfFromFile(fileContent))
        }
        this.content=contentConf
        this.loop=setInterval(()=>this.update(),motdConf.get("freq")*1000)
    }
    update(){
        worker.postMessage({
            cmdType:"render",
            conf:this.content,
            frame:this.frame,
            vars:{},
            target:{
                position:"motd"
            }
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
    //为当前所有玩家所需的侧边栏整理出一个列表
    //每tick所有玩家所需的变量的并集将被提前整理出来，放进一个单独的集合里
    //监听到tick时，判断当前tick是否有侧边栏需要渲染，如果需要就调用渲染服务，将这个tick所需的全部侧边栏渲染出来
})

//处理渲染服务返回值并发送至游戏
parentPort?.on('message',msg=>{
    switch(msg.target?.position){
        case "motd":Logger.info(msg.result)
    }
})