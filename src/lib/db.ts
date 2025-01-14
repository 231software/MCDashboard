import { Logger, Player, SQLDataType, SQLDataTypeEnum, SQLite3, SQLite3Column } from "../../lib"

export abstract class DBManager{
    protected loaded:boolean=false
    protected _db:SQLite3|undefined
    protected _path:string
    constructor(path:string){
        this._path=path
    }
    dbMigration():void{}
    get db(){
        if(this._db!=undefined)return this._db
        else throw new Error("数据库已卸载或出错（可能未初始化）")
        
    }
    get path(){
        return this._path
    }
    unload(){	
        if(!this.loaded||this._db==undefined)return false
        const result=this._db.close()
        if(result){
            this.loaded=false
            this._db=undefined
        }
        return result
    }
    load(){	
        if(this.loaded)return false;
        this._db=new SQLite3(this._path)
        this.loaded=true
        return true
    }
    abstract init():void;
}

export class PlayerPreferencesTable<T extends DBManager>{
    tableName:string
    manager:T
    columns:SQLite3Column[]
    constructor(tableName:string,manager:T,...columns:SQLite3Column[]){
        this.tableName=tableName
        this.manager=manager
        this.columns=columns
    }
    init(){
        //创建玩家个人设置表
        //初始化玩家时，要记录一个玩家数据是否被玩家自行修改过的列，一旦玩家修改过该列，这个值就为true
        //如果玩家未修改过数据，那么每次他初始化都会用配置文件中的默认数据覆盖
        this.manager.db.initTable(this.tableName,...this.columns)
        for(let column of this.columns)this.manager.db.newColumn(this.tableName,column)
    }
    set(data:[string,any][]){
        Logger.info(this.manager.db.getColumns(this.tableName))
        Logger.error("本次set有一些在数据库中未找到对应列的数据，因此这些数据未被设置。它们是：")
    }
    get(uuid:string){
        return this.manager.db.getRowFromPrimaryKey(this.tableName,uuid)
    }
}

export class PlayerPreference<T extends DBManager>{
    playerObj:Player|undefined
    tableName:string;
    constructor(uuid:string,manager:T,tableName:string){
        this.playerObj=Player.getOnlinePlayer(uuid)
        this.tableName=tableName
        this.init()
    }
    init(){
        if(this.playerObj==undefined||this.playerObj?.isOnline())throw new Error("只能对在线玩家初始化数据！") 
        const {xuid,uuid,name}=this.playerObj
        //xuid和name是每次都必须写入的

    }
}