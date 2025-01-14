
export enum AnimationType{
    ROLL,
    SHAKE,
    ALT
}

export enum MCTextColor{
    WHITE,
    BLACK,
    YELLOW,
    RED,
    BLUE,
    DARK_BLUE,
    COIN_GOLD,
    AUQA,
    LIGHT_PURPLE
}

export function fromMCTextColor(colorEnum:MCTextColor){
    switch(colorEnum){
        case MCTextColor.AUQA:return "§b"
        case MCTextColor.BLACK:return "§0"
        case MCTextColor.BLUE:return "§9"
        case MCTextColor.COIN_GOLD:return "§g"
        case MCTextColor.DARK_BLUE:return "§1"
        case MCTextColor.LIGHT_PURPLE:return "§d"
        case MCTextColor.RED:return "§c"
        case MCTextColor.WHITE:return "§f"
        case MCTextColor.YELLOW:return "§e"
        default:throw new Error("不支持的颜色枚举："+colorEnum)
    }
}

export interface AnimatedTextConfig{
    type:AnimationType,
    contents:{
        text:string,
        color?:MCTextColor,
        bold?:boolean,
        italic?:boolean
    }[][],
    interval?:number,
    length?:number
    spaces?:number
}

export interface GameVars{
    weather?:string,
    worldTime?:[number,number],
    biome?:string
}