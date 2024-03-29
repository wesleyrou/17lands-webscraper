import puppeteer, { Keyboard } from 'puppeteer';
// import {readFileSync} from 'fs';

// const dataSet = 'plat+'
const dataSet = 'diamond+'
const expansion = 'LCI'
// const expansion = 'Y24'

const parseColorData = (html) => {
    let sliceRangeStart = html.split('</tr>').findIndex(row => row.match(/<tr class="color-summary"><td class="">Two-color/g))
    let data = html.split('</tr>').slice(sliceRangeStart + 1,sliceRangeStart + 11).map(row => {
        // console.log(row)
        let [color, wins, games, wr] = row.slice(42,-5).split('</td><td class="">')
        // console.log(color)
        return {'color':color.slice(-3,-1),wins,games,wr,'drafts':Math.round((games - wins) / 3),}
    })
    let totalDrafts = data.reduce((cum, acc) => cum + acc.drafts, 0)
    data.forEach(info => info.percentTotalDrafts = `${Math.round(info.drafts/totalDrafts*1000)/10}`)
    return data
}

const parseTrophyData = (html) => {
    let data = html.split('</tr>')
    .map(row => {
        let [date,win,loss,rank,color,link] = row.slice(0,-5).split('</td><td class="">')
        return {
            'date':date.slice(-16),
            win,
            loss,
            'rank':(rank !== undefined && rank !== '')? rank.split(' ')[2] : '',
            'color':(color !== undefined && color !== '')? color.split('"')[1] : '',
            link,
        }
    })
    return data
}

const sevenDaysAgoDate = (daysAgo = 7) => {
    let date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()
    if(day >= (1 + daysAgo)) {
        day-=daysAgo
    } else {
        switch(month){
            case 1:
                year--
                month = 12
                day = 31 - (daysAgo - day)
                break;
            case 2,4,6,8,9,11:
                month--
                day = 31 - (daysAgo - day)
                break;

            case 5,7,10,12:
                month--
                day = 30 - (daysAgo - day)
                break;

            case 3:
                month = 2
                day = 28 - (daysAgo - day)
                break;
            default:
                break;
        }
    }
    day < 10 ? day = '0'+ day: day = day.toString()
    month < 10 ? month = '0'+ month: month = month.toString()
    return `${month}/${day}/${year}`
}

const main = async () => {
    // const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({headless: true});
    //Headless:false for testing
    // const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.goto('https://17lands.com');

    // Set screen size
    await page.setViewport({width: 1080, height: 1024});

    //Click Analytics menu
    let analyticsDropDownMenu = await page.waitForSelector('text/Analytics');
    await analyticsDropDownMenu.click();

    //Click Color Performance tab
    const colorPerformanceMenuTab = await page.waitForSelector('text/Deck Color Data');
    await colorPerformanceMenuTab.click();
    
    //Fill Expansion Picker
    const expansionContainer = await page.waitForSelector('#expansion.form-control')
    await expansionContainer.click({ clickCount: 3 })
    await page.type('#expansion.form-control', expansion, {delay:150});
    await page.keyboard.press('Enter')
    
    //Fill Date Picker
    const datePickerContainer = await page.waitForSelector('.form-control.date-picker')
    await datePickerContainer.click({ clickCount: 3 })
    await page.type('.form-control.date-picker', sevenDaysAgoDate());

    //Get tbody HTML
    let tableHandle = await page.waitForSelector('tbody')
    let tableHTML = await page.evaluate(el => el.innerHTML,tableHandle)

    //parse to get colorData
    let colorData = await parseColorData(tableHTML)
    // console.log(colorData)

    await tableHandle.dispose();
    await colorPerformanceMenuTab.dispose();
    await analyticsDropDownMenu.dispose();

    //Click Analytics menu
    analyticsDropDownMenu = await page.waitForSelector('text/Analytics');
    await analyticsDropDownMenu.click();

    //Click Recent Trophy tab
    const trophyTab = await page.waitForSelector('text/Trophy Decks');
    await trophyTab.click();

    //Fill Expansion Picker
    const expansionContainerTrophy = await page.waitForSelector('#expansion.form-control')
    await expansionContainerTrophy.click({ clickCount: 3 })
    await page.type('#expansion.form-control', expansion, {delay:150});
    await page.keyboard.press('Enter')

    //Get tbody HTML
    tableHandle = await page.waitForSelector('tbody')
    tableHTML = await page.evaluate(el => el.innerHTML,tableHandle)

    //parse to get trophyData
    let trophyData = parseTrophyData(tableHTML)

    await tableHandle.dispose();
    await trophyTab.dispose();
    await analyticsDropDownMenu.dispose();

    await browser.close();

    //Run Analysis on colorData and trophyData
    analyze(colorData,trophyData)
}

const analyze = (colorData, trophyData) => {
    let bronzeData = trophyData.filter(run => run.rank.search(/bronze/i) !== -1)
    let silverData = trophyData.filter(run => run.rank.search(/silver/i) !== -1)
    let goldData = trophyData.filter(run => run.rank.search(/gold/i) !== -1)
    let platinumData = trophyData.filter(run => run.rank.search(/platinum/i) !== -1)
    let diamondData = trophyData.filter(run => run.rank.search(/diamond/i) !== -1)
    let mythicData = trophyData.filter(run => run.rank.search(/mythic/i) !== -1)

    let breakdown = {}
    trophyData.forEach(run => breakdown[run.color] ? breakdown[run.color]++ : breakdown[run.color] = 1)
    let bronzeBreakdown = {}
    bronzeData.forEach(run => bronzeBreakdown[run.color] ? bronzeBreakdown[run.color]++ : bronzeBreakdown[run.color] = 1)
    let silverBreakdown = {}
    silverData.forEach(run => silverBreakdown[run.color] ? silverBreakdown[run.color]++ : silverBreakdown[run.color] = 1)
    let goldBreakdown = {}
    goldData.forEach(run => goldBreakdown[run.color] ? goldBreakdown[run.color]++ : goldBreakdown[run.color] = 1)
    let platinumBreakdown = {}
    platinumData.forEach(run => platinumBreakdown[run.color] ? platinumBreakdown[run.color]++ : platinumBreakdown[run.color] = 1)
    let diamondBreakdown = {}
    diamondData.forEach(run => diamondBreakdown[run.color] ? diamondBreakdown[run.color]++ : diamondBreakdown[run.color] = 1)
    let mythicBreakdown = {}
    mythicData.forEach(run => mythicBreakdown[run.color] ? mythicBreakdown[run.color]++ : mythicBreakdown[run.color] = 1)
    
    //PLAT+ vs DIAMOND+
    let platPlusBreakdown = {}, platPlusData
    if(dataSet === 'plat+') platPlusData = [...mythicData,...platinumData,...diamondData]
    else platPlusData = [...mythicData,...diamondData]
    console.log('DataSet:',dataSet)
    
    platPlusData.forEach(run => platPlusBreakdown[run.color] ? platPlusBreakdown[run.color]++ : platPlusBreakdown[run.color] = 1)

    // console.log('Platinum')
    // platinumBreakdown = Object.entries(platinumBreakdown).sort((a,b) => b[1] - a[1]).slice(0,10)
    // console.log(platinumBreakdown)
    // console.log('Diamond')
    // diamondBreakdown = Object.entries(diamondBreakdown).sort((a,b) => b[1] - a[1])
    // console.log(diamondBreakdown)
    // console.log('Mythic')
    // mythicBreakdown = Object.entries(mythicBreakdown).sort((a,b) => b[1] - a[1])
    // console.log(mythicBreakdown)
    // console.log('PlatToMyth')
    platPlusBreakdown = Object.entries(platPlusBreakdown).sort((a,b) => b[1] - a[1])
    // console.log(platPlusBreakdown)
    // console.log(colorData)

    colorData.map(row => {
        // console.log(row)
        try {
            row.trophies = platPlusBreakdown.find(element => element[0] === row.color || element[0].split('').reverse().join('') === row.color)[1]
        }catch{
            row.trophies = 0
        }
        row.adjustedTrophies = row.trophies/row.percentTotalDrafts
        return row
    })
    colorData.sort((a,b) => b.adjustedTrophies - a.adjustedTrophies)
    colorData.forEach(color => console.log(`Color: ${color.color} WinRate: ${color.wr} PlayRate: ${color.percentTotalDrafts}% Trophies: ${color.trophies} AdjustedTrophyScore: ${color.adjustedTrophies}`))
    let individualColorBreakdown = {
        W:{},
        U:{},
        B:{},
        R:{},
        G:{},
    }
    colorData.forEach(color => {
        if(color.color.match(/W/)) {
            individualColorBreakdown.W.wins ? individualColorBreakdown.W.wins += parseInt(color.wins) : individualColorBreakdown.W.wins = parseInt(color.wins)
            individualColorBreakdown.W.games ? individualColorBreakdown.W.games += parseInt(color.games) : individualColorBreakdown.W.games = parseInt(color.games)
        }
        if(color.color.match(/U/)) {
            individualColorBreakdown.U.wins ? individualColorBreakdown.U.wins += parseInt(color.wins) : individualColorBreakdown.U.wins = parseInt(color.wins)
            individualColorBreakdown.U.games ? individualColorBreakdown.U.games += parseInt(color.games) : individualColorBreakdown.U.games = parseInt(color.games)
        }
        if(color.color.match(/B/)) {
            individualColorBreakdown.B.wins ? individualColorBreakdown.B.wins += parseInt(color.wins) : individualColorBreakdown.B.wins = parseInt(color.wins)
            individualColorBreakdown.B.games ? individualColorBreakdown.B.games += parseInt(color.games) : individualColorBreakdown.B.games = parseInt(color.games)
        }
        if(color.color.match(/R/)) {
            individualColorBreakdown.R.wins ? individualColorBreakdown.R.wins += parseInt(color.wins) : individualColorBreakdown.R.wins = parseInt(color.wins)
            individualColorBreakdown.R.games ? individualColorBreakdown.R.games += parseInt(color.games) : individualColorBreakdown.R.games = parseInt(color.games)
        }
        if(color.color.match(/G/)) {
            individualColorBreakdown.G.wins ? individualColorBreakdown.G.wins += parseInt(color.wins) : individualColorBreakdown.G.wins = parseInt(color.wins)
            individualColorBreakdown.G.games ? individualColorBreakdown.G.games += parseInt(color.games) : individualColorBreakdown.G.games = parseInt(color.games)
        }
    })

    for(let color in individualColorBreakdown){
        individualColorBreakdown[color].winPercent = Math.trunc((individualColorBreakdown[color].wins/individualColorBreakdown[color].games)*1000)/10
    }

    console.log(individualColorBreakdown)

    // console.log(colorData)
}

main()