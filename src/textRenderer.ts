//文字渲染服务仅能依赖nodejs，不能引入任何满月平台的api
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import { AnimatedTextConfig, AnimationType, fromMCTextColor, GameVars, MCTextColor } from './lib/display';

let replyPort:any

function reply(data:any){
    replyPort.postMessage(data);
}

parentPort?.once('message',msg=>{
    replyPort=msg.port
    // 发送初始确认消息 
    reply({ status: "connected" })

})
parentPort?.on("message", msg => { 
    switch(msg.cmdType){
        case "render":{
            reply(render(msg.conf,msg.frame,msg.vars,msg.target));
            break;
        }
    }
});
const MCColorCodeReg=/§[0-9a-zA-Z]/g

function render(conf:AnimatedTextConfig[],frame:number,vars:GameVars,target:any){
    //conf里面还有个interval的参数，具体就是用frame除以interval，如果interval为0就采用默认值
    let resultText=""
    for(let part of conf){
        switch(part.type){
            case AnimationType.ROLL:{
                const {contents,length}=part
                let {spaces}=part
                if(length==undefined){
                    replyLogger.error("当动画类型设置为roll时，必须具有length属性。")
                    return;
                }
                //spaces未设置时将其重置为默认的0
                if(spaces==undefined)spaces=0
                //目前先默认所有动画都是roll，alt和shake不用管
                //调用这个函数的时候，不仅需要解析原有字符串中的颜色代码，还需要解析配置中已经存在的颜色代码并将其加入到整理出的颜色代码的最前面
                const results=processRollPattern(contents,frame,length,spaces)
                //生成输出结果
                let partResultText=generateTextInGame(results)
                //在进行结果的拼接之前，还需要将颜色代码进行翻译并加入字符串中
                resultText=resultText+partResultText;   
                break;
            }
            case AnimationType.ALT:{
                const {contents,length}=part
                if(length==undefined){
                    replyLogger.error("当动画类型设置为roll时，必须具有length属性。")
                    return;
                }
                const results=processAltPattern(contents,frame,length)
                //生成输出结果
                let partResultText=generateTextInGame(results)
                resultText=resultText+partResultText
                break;
            }
            case AnimationType.SHAKE:throw new Error("当前动画渲染还不支持shake类型");
        }        
    }
    return {
        conf,
        frame,
        result:resultText,
        target
    }


}

//将输入的字符串按颜色代码分割，然后按颜色代码和字长对字符串进行分组
function groupColorCodes(rawInput:string){
    //如果字符串没有以任何颜色代码开始，此变量为true，表示最开头会出现一个§r，需要在后面主动去掉
    let startWithoutColorCode=false
    const input=(()=>{
        if(new RegExp(`^${MCColorCodeReg.source}`).test(rawInput)){
            return rawInput
        }
        else{
            startWithoutColorCode=true
            return "§r"+rawInput
        }
    })()
    const matches:{
        index:number,
        value:string
    }[] = [];
    let match:RegExpExecArray | null;

    while ((match = MCColorCodeReg.exec(input)) !== null) {
        matches.push({ index: match.index, value: match[0] });
    }

    const groupedResult:{mcColorCodes:string[],chs:string[]}[] = [];
    let currentObject:{mcColorCodes:string[],chs:string[]} = { mcColorCodes: [], chs: [''] };
    let lastIndex = 0;

    matches.forEach(({ index, value }) => {
        if (index > lastIndex) {
            currentObject.chs = splitByCharacterLength(input.slice(lastIndex, index));
            groupedResult.push(currentObject);
            currentObject = { mcColorCodes: [], chs: [''] };
            lastIndex = index;
        }
        currentObject.mcColorCodes.push(value);
        lastIndex += value.length;
    });

    if (lastIndex < input.length) {
        currentObject.chs = splitByCharacterLength(input.slice(lastIndex));
        groupedResult.push(currentObject);
    }
    //如果字符串开头有那个人为添加的颜色代码，则将其去掉
    if(startWithoutColorCode){
        groupedResult[0].mcColorCodes.splice(groupedResult[0].mcColorCodes.indexOf("§r"),1)
    }

    return groupedResult;
}

function splitByCharacterLength(input: string): string[] {
    const result: string[] = [];
    let currentWord: string = '';

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        // 如果是汉字或其他全角字符
        if (char.charCodeAt(0) > 255) {
            if (currentWord.length > 0) {
                result.push(currentWord);
                currentWord = '';
            }
            result.push(char);
        } else {
            // 如果是半角字符
            currentWord += char;
            if (currentWord.length === 2) {
                result.push(currentWord);
                currentWord = '';
            }
        }
    }

    if (currentWord.length > 0) {
        result.push(currentWord);
    }

    return result;
}

//输入的是二维的段落，这些段落在函数里被flat，变成一维
function processRollPattern(input:{
    text: string;
    color?: MCTextColor;
    bold?: boolean;
    italic?: boolean;
}[][],start:number,length:number,spaces:number
):{
    text: {
        mcColorCodes: string[];
        chs: string[];
    }[];
    color?: MCTextColor;
    bold?: boolean;
    italic?: boolean;
}[]{
    //先将输入的原始数据分割成单个字
    const splittedStrings:{
        text: {
            mcColorCodes:string[],
            chs:string[]
        }[];
        color?: MCTextColor;
        bold?: boolean;
        italic?: boolean;
    }[][]=[]
    for(let paragraph of input){
        const splittedParagraphs:{
            text: {
                mcColorCodes:string[],
                chs:string[]
            }[];
            color?: MCTextColor;
            bold?: boolean;
            italic?: boolean;
        }[]=[]
        for(let pattern of paragraph){
            splittedParagraphs.push({
                text:groupColorCodes(pattern.text),
                color:pattern.color,
                bold:pattern.bold,
                italic:pattern.italic
            })
        }
        splittedStrings.push(splittedParagraphs)
    }
    //在刚刚分割好的片段中循环，生成切片后的内容
    //输入的这个数据，内层是单个片段，外层是大的部分
    //输出结果已无段落概念，所有的字段都由片段的格式组成
    const results:{
        text: {
            mcColorCodes:string[],
            chs:string[]
        }[];
        color?: MCTextColor;
        bold?: boolean;
        italic?: boolean;
    }[]=[]
    //已经检查的字的数量
    let checkedLength=0
    //为了能够截取到字符串相对开始位置，需要先计算出所有字段的长度
    //字符串循环的长度
    const loopLength=(()=>{
        let loopLength=0
        //计算字符串的长度
        //遍历段落
        for(let paragraph of splittedStrings){
            //遍历片段
            for(let pattern of paragraph){
                //遍历一个已预先加入颜色代码的片段
                for(let preColoredPattern of pattern.text){
                    //遍历单个字
                    for(let ch of preColoredPattern.chs){
                        loopLength++
                    }
                }
            }
            //处理完当前段落之后，在当前段落后加上空格的数量
            loopLength+=spaces
        }
        return loopLength
    })()
    //字符串的实际开始位置
    const realStart=start%loopLength
    //已经遍历的字符数量
    let checkedCharCount=0
    //已经添加的字符数量
    let addedCharCount=0
    //开始循环重复地添加字符，直到添加的字符长度足够
    while(addedCharCount<length){
        //对配置中的字符进行循环
        //循环外层数组，外层数组代表段落
        for(let paragraph of splittedStrings){
            //循环内层片段，内层数组代表片段
            for(let pattern of paragraph){
                const patternResult:{
                    text: {
                        mcColorCodes:string[],
                        chs:string[]
                    }[];
                    color?: MCTextColor;
                    bold?: boolean;
                    italic?: boolean;
                }={
                    text:[],
                    color:pattern.color,
                    bold:pattern.bold,
                    italic:pattern.italic
                }
                //对中间的预先染色过的片段进行遍历
                for(let preColoredPattern of pattern.text){
                    const preColoredPatternResult:{
                        mcColorCodes:string[],
                        chs:string[]
                    }={
                        mcColorCodes:preColoredPattern.mcColorCodes,
                        chs:[]
                    }
                    for(let ch of preColoredPattern.chs){
                        checkRangeAndPush(preColoredPatternResult.chs,ch)
                    }
                    if(preColoredPatternResult.chs.length>0)patternResult.text.push(preColoredPatternResult)                      
                }
                if(patternResult.text.length>0)results.push(patternResult)

            }
            //达到当前段落尾部时添加空位字符
            //空位字符属于单独的片段
            const result:{
                text:{
                    mcColorCodes:string[],
                    chs:string[]
                }[]
            }={
                text:[{
                    mcColorCodes:["§r"],
                    chs:[],
                }]
            }
            for(let i=0;i<spaces;i++){
                checkRangeAndPush(result.text[0].chs,"  ")
            }              
            if(result.text[0].chs.length>0)results.push(result)
            
        }
    }
    return results
    //传入一个数组和一个要添加的字，如果当前位置可以添加，则自增对应统计数字，然后将传入的字添加到传入的数组中
    function checkRangeAndPush(targetArrReference:Array<string>,ch:string){
        //检查当前位置并开始添加字
        //达到start且不超过start+length才添加对应字
        if(checkedCharCount>=realStart&&checkedCharCount<realStart+length){
            targetArrReference.push(ch)
            //添加字符成功时此变量才自增
            addedCharCount++
        }
        //无论如何这个变量都是要自增的
        checkedCharCount++
    }
}
function generateTextInGame(input:{
    //这个text是一组颜色代码和一组plaintext的组合
    text: {
        mcColorCodes: string[];
        chs: string[];
    }[];
    color?: MCTextColor;
    bold?: boolean;
    italic?: boolean;
}[]):string{
    let resultPattern=""
    for(let pattern of input){
        let patternColorCodes:Set<string>=new Set()
        //pattern.color是配置文件中定义的颜色
        if(pattern.color!=undefined)patternColorCodes.add(fromMCTextColor(pattern.color))
        if(pattern.bold)patternColorCodes.add("§l")//加粗和斜体
        if(pattern.italic)patternColorCodes.add("§o")//加粗和斜体
        for(let preColoredPattern of pattern.text){
            //mcColorCodes是预染色的颜色代码
            //betterLogger(preColoredPattern)
            for(let preColorCode of preColoredPattern.mcColorCodes){
                //向颜色代码集合中添加预染色的颜色代码来去重
                patternColorCodes.add(preColorCode)
            }
            for(let preColorCode of patternColorCodes){
                //正式地向最终结果中添加颜色代码
                resultPattern=resultPattern+preColorCode
            }
            for(let ch of preColoredPattern.chs){
                resultPattern=resultPattern+ch
            }
            //循环过每个pattern之后颜色代码都会重置，如果中间用户自己加了颜色代码，会导致从那个节点重新开始，而配置文件中定义的颜色代码也会被刷新掉
            patternColorCodes=new Set<string>()
        }
    }
    //在最后添加一个颜色代码防止对后方内容染色
    resultPattern=resultPattern+"§r"
    //全部颜色解析完毕后，进行变量替换
    return resultPattern
}

function processAltPattern(input:{
    text: string;
    color?: MCTextColor;
    bold?: boolean;
    italic?: boolean;
}[][],frame:number,length:number):{
    text: {
        mcColorCodes: string[];
        chs: string[];
    }[];
    color?: MCTextColor;
    bold?: boolean;
    italic?: boolean;
}[]{
    const realFrame=frame%input.length
    const currentParagraph=input[realFrame]
    //alt一次只针对一个paragraph，而不是遍历所有paragraph
    const splittedCurrentParagraph:{
        text: {
            mcColorCodes: string[];
            chs: string[];
        }[];
        color?: MCTextColor;
        bold?: boolean;
        italic?: boolean;
    }[]=[]
    for(let pattern of currentParagraph){
        splittedCurrentParagraph.push({
            text:groupColorCodes(pattern.text),
            color:pattern.color,
            bold:pattern.bold,
            italic:pattern.italic
        })
    }
    //处理分割完的段落使长度一致，长度不够就补空格，长度够了就不加了
    let addedChs=0
    const slicedParagraph:{
        text: {
            mcColorCodes: string[];
            chs: string[];
        }[];
        color?: MCTextColor;
        bold?: boolean;
        italic?: boolean;
    }[]=[]
    for(let pattern of splittedCurrentParagraph){
        const splittedPreColoredPattern:{
            mcColorCodes: string[];
            chs: string[];
        }[]=[]
        for(let preColoredPattern of pattern.text){
            const splittedChs:string[]=[]
            for(let ch of preColoredPattern.chs){
                //长度够了就不加了，长度不够才会加
                //如果长度等于0，他就会一直加，直到全加入
                if(length==0||addedChs<length){
                    splittedChs.push(ch)
                    addedChs++
                }
            }
            splittedPreColoredPattern.push({
                mcColorCodes:preColoredPattern.mcColorCodes,
                chs:splittedChs
            })
        }
        slicedParagraph.push({
            text:splittedPreColoredPattern,
            color:pattern.color,
            bold:pattern.bold,
            italic:pattern.italic
        })
    }
    //已经指定了长度，而且长度不够但是字符已经没了
    if(length!=0&&addedChs<length){
        const placeholder:{
            text: {
                mcColorCodes: string[];
                chs: string[];
            }[];
            color?: MCTextColor;
            bold?: boolean;
            italic?: boolean;
        }={
            text:[{
                mcColorCodes:[],
                chs:[]
            }]
        }
        while(addedChs<length){
            placeholder.text[0].chs.push("  ")
            addedChs++
        }
        slicedParagraph.push(placeholder)
    }
    return slicedParagraph
    
}

class replyLogger{
    static info(...args:any[]){
        reply({target:{position:"console"},level:"info",msg:args})
    }
    static error(...args:any[]){
        reply({target:{position:"console"},level:"error",msg:args})
    }
}
function betterLogger(arg:any){
    const parsedArg=JSON.stringify(arg,undefined,4)
    const splittedArg=parsedArg.split("\n")
    for(let line of splittedArg){
        console.log("> "+line)
    }
    
}

/*
//AI生成的代码
function sliceGroupedResult(groupedResult:{mcColorCodes:string[],text:string}[], start:number, length:number) {
    let currentLength = 0;
    let startIndex = 0;
    let sliceStart = -1;
    let sliceEnd = -1;
    let endIndex = 0;
    let charCount = 0;

    for (let i = 0; i < groupedResult.length; i++) {
        const textLength = getCharLength(groupedResult[i].text);
        if (charCount + textLength >= start) {
            startIndex = i;
            break;
        }
        charCount += textLength;
    }

    let remainingLength = length;

    for (let i = startIndex; i < groupedResult.length; i++) {
        const text = groupedResult[i].text;
        const textLength = getCharLength(text);
        if (currentLength + textLength > remainingLength) {
            endIndex = i;
            break;
        }
        currentLength += textLength;
    }

    const slicedResult:{mcColorCodes:string[],text:string}[] = [];
    let charPos = charCount;

    for (let i = startIndex; i <= endIndex; i++) {
        const obj = groupedResult[i];
        let startText = '';
        let endText = '';

        if (i === startIndex) {
            const text = obj.text;
            for (let j = 0; j < text.length; j++) {
                const charLength = getCharLength(text[j]);
                if (charPos + charLength > sliceStart) {
                    startText = text.slice(j);
                    break;
                }
                charPos += charLength;
            }
        } else {
            startText = obj.text;
        }

        if (i === endIndex) {
            const text = obj.text;
            for (let j = 0; j < text.length; j++) {
                const charLength = getCharLength(text[j]);
                endText += text[j];
                if (charPos + charLength >= sliceEnd) {
                    endText = endText.slice(0, endText.length - (charPos + charLength - sliceEnd));
                    break;
                }
                charPos += charLength;
            }
        } else {
            endText = startText;
        }

        slicedResult.push({
            mcColorCodes: obj.mcColorCodes,
            text: endText
        });
    }

    return slicedResult;
    
    function getCharLength(str:string) {
        return Array.from(str).reduce((length, char) => {
            return length + (char.match(/[^\x00-\xff]/) ? 1 : 0.5);
        }, 0);
    }
}


const MCColorCodeReg = /§[0-9a-zA-Z]/g;

function groupColorCodes(rawInput) {
    const input = "§r" + rawInput;
    const matches = [];
    let match;

    while ((match = MCColorCodeReg.exec(input)) !== null) {
        matches.push({ index: match.index, value: match[0] });
    }

    const groupedResult = [];
    let currentObject = { mcColorCodes: [], text: '' };
    let lastIndex = 0;

    matches.forEach(({ index, value }) => {
        if (index > lastIndex) {
            currentObject.text = input.slice(lastIndex, index);
            groupedResult.push(currentObject);
            currentObject = { mcColorCodes: [], text: '' };
            lastIndex = index;
        }
        currentObject.mcColorCodes.push(value);
        lastIndex += value.length;
    });

    if (lastIndex < input.length) {
        currentObject.text = input.slice(lastIndex);
        groupedResult.push(currentObject);
    }

    return groupedResult;
}

function getCharLength(str) {
    return Array.from(str).reduce((length, char) => {
        return length + (char.match(/[^\x00-\xff]/) ? 1 : 0.5);
    }, 0);
}

function sliceGroupedResult(groupedResult, start, length) {
    let currentLength = 0;
    let charPos = 0;
    let sliceStart = -1;
    let sliceEnd = -1;
    let remainingLength = length;
    let startIndex = 0;
    let endIndex = 0;

    // 找到切片的起始位置
    for (let i = 0; i < groupedResult.length; i++) {
        const obj = groupedResult[i];
        const text = obj.text;
        let textLength = 0;

        for (let j = 0; j < text.length; j++) {
            const charLength = getCharLength(text[j]);
            textLength += charLength;

            if (charPos + textLength >= start && sliceStart === -1) {
                sliceStart = charPos + textLength - charLength;
                startIndex = i;
            }

            if (charPos + textLength >= start + length && sliceEnd === -1) {
                sliceEnd = charPos + textLength;
                endIndex = i;
                break;
            }
        }

        charPos += textLength;
        if (sliceEnd !== -1) break;
    }

    const slicedResult = [];
    charPos = 0;

    for (let i = startIndex; i <= endIndex; i++) {
        const obj = groupedResult[i];
        let startText = '';
        let endText = '';

        if (i === startIndex) {
            const text = obj.text;
            for (let j = 0; j < text.length; j++) {
                const charLength = getCharLength(text[j]);
                if (charPos + charLength > sliceStart) {
                    startText = text.slice(j);
                    break;
                }
                charPos += charLength;
            }
        } else {
            startText = obj.text;
        }

        if (i === endIndex) {
            const text = obj.text;
            for (let j = 0; j < text.length; j++) {
                const charLength = getCharLength(text[j]);
                endText += text[j];
                if (charPos + charLength >= sliceEnd) {
                    endText = endText.slice(0, endText.length - (charPos + charLength - sliceEnd));
                    break;
                }
                charPos += charLength;
            }
        } else {
            endText = startText;
        }

        slicedResult.push({
            mcColorCodes: obj.mcColorCodes,
            text: endText
        });
    }

    return slicedResult;
}

const input = [
    { mcColorCodes: [ '§r' ], text: '欢迎使用' },
    { mcColorCodes: [ '§b', '§u' ], text: 'MCDa' },
    { mcColorCodes: [ '§k', '§6' ], text: 'shboard!' }
];

const groupedResult = input; // 假设已经经过 groupColorCodes 函数处理
const result = sliceGroupedResult(groupedResult, 3, 5);

console.log(result);
// 预期输出:
// [
//   { mcColorCodes: [ '§r' ], text: '用' },
//   { mcColorCodes: [ '§b', '§u' ], text: 'MCDa' },
//   { mcColorCodes: [ '§k', '§6' ], text: 'shbo' }
// ]

*/
