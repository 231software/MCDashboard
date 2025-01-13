import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import { AnimatedTextConfig, AnimationType, GameVars } from './lib/display';

parentPort?.on('message',msg=>render(msg.conf,msg.frame,msg.vars))

function render(conf:AnimatedTextConfig[],frame:number,vars:GameVars){

}