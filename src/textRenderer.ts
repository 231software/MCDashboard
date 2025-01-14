//文字渲染服务仅能依赖nodejs，不能引入任何满月平台的api
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import { AnimatedTextConfig, AnimationType, fromMCTextColor, GameVars, MCTextColor } from './lib/display';

parentPort?.on('message',msg=>{
    switch(msg.cmdType){
        case "render":render(msg.conf,msg.frame,msg.vars,msg.target);break;
    }
})
const MCColorCodeReg=/§[0-9a-zA-Z]/g

function render(conf:AnimatedTextConfig,frame:number,vars:GameVars,target:any){
    switch(conf.type){
        case AnimationType.ROLL:{
            //目前先默认所有动画都是roll，alt和shake不用管
            console.log("渲染"+conf.contents[0][0])
            console.log("frame:",frame)
            //调用这个函数的时候，不仅需要解析原有字符串中的颜色代码，还需要解析配置中已经存在的颜色代码并将其加入到整理出的颜色代码的最前面
            const results=processPattern(groupColorCodes(conf.contents),frame,7,3)
            //检查输出结果
            let textResult=""
            for(let result of results){
                textResult=textResult+result.text
            }
            //在进行结果的拼接之前，还需要将颜色代码进行翻译并加入字符串中
            parentPort?.postMessage({
                conf,
                frame,
                result,
                target
            })        
            break;     
        }
        case AnimationType.SHAKE
    }


}

function groupColorCodes(rawInput:{text:string,bold:boolean,italic:boolean,color:MCTextColor}[][]){
    const input=new RegExp(`^${MCColorCodeReg.source}`).test(rawInput)?rawInput:"§r"+rawInput
    const matches:{
        index:number,
        value:string
    }[] = [];
    let match:RegExpExecArray | null;

    while ((match = MCColorCodeReg.exec(input)) !== null) {
        matches.push({ index: match.index, value: match[0] });
    }

    const groupedResult:{mcColorCodes:string[],text:string[]}[] = [];
    let currentObject:{mcColorCodes:string[],text:string[]} = { mcColorCodes: [], text: [''] };
    let lastIndex = 0;

    matches.forEach(({ index, value }) => {
        if (index > lastIndex) {
            currentObject.text = splitByCharacterLength(input.slice(lastIndex, index));
            groupedResult.push(currentObject);
            currentObject = { mcColorCodes: [], text: [''] };
            lastIndex = index;
        }
        currentObject.mcColorCodes.push(value);
        lastIndex += value.length;
    });

    if (lastIndex < input.length) {
        currentObject.text = splitByCharacterLength(input.slice(lastIndex));
        groupedResult.push(currentObject);
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

function processPattern(input:{mcColorCodes:string[],text:string[]}[][],start:number,length:number,spaces:number):{mcColorCodes:string[],text:string}[]{
    //输入的这个数据，内层是单个片段，外层是大的部分
    const results:{mcColorCodes:string[],text:string}[]=[]
    let originalLength=(()=>{
        let originalLength=0
        //计算字符串的长度
        for(let pattern of input){
            const result={
                mcColorCodes:pattern.mcColorCodes,
                text:""
            }
            //加上当前循环到的字符串的长度
            originalLength+=pattern.text.length
        }
        return originalLength
    })()
    //字符串循环的长度
    const loopLength=originalLength+spaces
    //字符串的实际开始位置
    const realStart=start%loopLength
    //已经遍历的字符数量
    let checkedCharCount=0
    //已经添加的字符数量
    let addedCharCount=0
    //开始添加字符，直到添加的字符长度足够
    while(addedCharCount<length){
        //对配置中的字符进行循环
        for(let pattern of input){
            const result={
                mcColorCodes:pattern.mcColorCodes,
                text:""
            }
            for(let ch of pattern.text){
                //达到start且不超过start+length才添加对应字符
                if(checkedCharCount>=realStart&&checkedCharCount<realStart+length){
                    result.text=result.text+ch
                    //添加字符成功时此变量才自增
                    addedCharCount++
                }
                //无论如何这个变量都是要自增的
                checkedCharCount++
            }
            results.push(result)
        }
        //循环添加空位字符
        //空位字符属于单独的片段
        const result={
            mcColorCodes:["§r"],
            text:""
        }
        for(let i=0;i<spaces;i++){
            //达到start且不超过start+length才添加对应字符
            if(checkedCharCount>=realStart&&checkedCharCount<realStart+length){
                result.text=result.text+"  "
                //添加字符成功时此变量才自增
                addedCharCount++
            }
            //无论如何这个变量都是要自增的
            checkedCharCount++
        }
        results.push(result)
    }
    return results
}
function generateTextInGame(input:{mcColorCodes:string[],text:string}[]):string{
    let resultPattern=""
    for(let patternData of input){
        for(let colorCode of patternData.mcColorCodes){
            resultPattern=resultPattern+colorCode
        }
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
