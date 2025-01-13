import { Player, SQLDataType, SQLDataTypeEnum, SQLite3, SQLite3Column } from "../lib";
import { DBManager,PlayerPreference, PlayerPreferencesTable } from "./lib/db";
import {data_path} from "../lib/plugin_info.js"

const tableName="player_preferences"


const playerPrefSQLiteColumns:SQLite3Column[]=[
    {
        name:"uuid",
        data_type:new SQLDataType(SQLDataTypeEnum.TEXT),
        constraint:{
            primary_key:true
        }
    },
    {
        name:"name",
        data_type:new SQLDataType(SQLDataTypeEnum.TEXT),
    },
    {
        name:"xuid",
        data_type:new SQLDataType(SQLDataTypeEnum.TEXT),
    },
    {
        name:"sidebar_enabled",
        data_type:new SQLDataType(SQLDataTypeEnum.BOOLEAN),
    },
    {
        name:"sidebar_content",
        data_type:new SQLDataType(SQLDataTypeEnum.TEXT),
    },
    {
        name:"sidebar_fps",
        data_type:new SQLDataType(SQLDataTypeEnum.INTEGER)
    }
]


class MainDBManager extends DBManager{
    constructor(){super(data_path+"/data.db")}
    init(){

    }
}

export const dbManager=new MainDBManager()

export const DashboardPrefTable=new PlayerPreferencesTable(tableName,dbManager,...playerPrefSQLiteColumns)


