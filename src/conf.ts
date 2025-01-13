import { JsonFile, YMLFile } from "../lib";
import { data_path } from "../lib/plugin_info";
import { AnimatedTextConfig, AnimationType, MCTextColor } from "./lib/display";

export const conf_path=data_path+"/config.yml"

export const conf=new YMLFile(conf_path)

conf.init("sidebar",{})

export const sidebarConf=new YMLFile(conf_path,["sidebar"])

sidebarConf.init("default",{
    title:[
        {
            type:"alt",
            content:["欢迎使用MCDashboard!"],
            length:0,
            interval:0,
            color:"light_purple",
            bold:true
        },
        {
            type:"alt",
            contents:["请管理员打开config.yml进行配置"],
            length:0,
            interval:0,
            color:"light_purple",
            bold:true
        }
    ],
    contents:[
        {
            type:"roll",
            contents:["执行/sidebar指令自定义侧边栏"],
            length:10,
            interval:1,
            color:"aqua"
        },{
            type:"roll",
            contents:["管理员执行/motd临时修改motd"],
            length:10,
            interval:1,
            color:"aqua"
        },{
            type:"roll",
            contents:["执行/compass开关高精度罗盘"],
            length:10,
            interval:1,
            color:"aqua"
        }

    ]
})

conf.init("motd",{
    freq:5.3,
    content:[
        {
            type:"roll",
            contents:["欢迎使用MCDashboard!"],
            length:7,
            interval:0,
            color:"aqua",
            bold:false,
            italic:false
        },{
            type:"roll",
            contents:["请管理员打开config.yml进行配置"],
            length:7,
            interval:0,
            color:"light_purple",
            bold:false,
            italic:false
        }
    ]
})

export function animationConfFromFile(conf:any):AnimatedTextConfig{
    const type=(()=>{
        switch(conf.type){
            case "roll":return AnimationType.ROLL;
            case "alt":return AnimationType.ALT;
            case undefined:throw new Error("以下动画配置未配置动画类型：\n"+JSON.stringify(conf.type,undefined,4))
            default:throw new Error("配置文件中有不支持的动画类型"+conf.type)
        }
    })()
    const color=(()=>{
        if(conf.color===undefined)return undefined
        switch(conf.color){
            case "aqua":return MCTextColor.AUQA
            case "black":return MCTextColor.BLACK
            case "white":return MCTextColor.WHITE
            case "yellow":return MCTextColor.YELLOW
            case "dark_blue":return MCTextColor.DARK_BLUE
            case "red":return MCTextColor.RED
            case "light_purple":return MCTextColor.LIGHT_PURPLE
            case "blue":return MCTextColor.BLUE
            case "coin_gold":return MCTextColor.COIN_GOLD
            default:throw new Error("配置文件中有不支持的颜色："+conf.color)
        }
    })()
    return {
        type,
        content:conf.content,
        interval:conf.interval,
        color,
        length:conf.length,
        shake:conf.shake,
        pause:conf.pause,
        bold:conf.bold,
        italic:conf.italic
    }
}