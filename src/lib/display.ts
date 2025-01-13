
export enum AnimationType{
    ROLL,
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

export interface AnimatedTextConfig{
    type:AnimationType,
    content:string[],
    interval:number,
    color?:MCTextColor,
    length?:number,
    shake?:boolean,
    pause?:number,
    bold?:boolean,
    italic?:boolean
}

export interface GameVars{
    weather?:string,
    worldTime?:[number,number],
    biome?:string
}