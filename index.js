import puppeteer from 'puppeteer';
// import {readFileSync} from 'fs';

const parseColorData = (html) => {
    let data = html.split('</tr>').slice(13,23).map(row => {
        let [color, wins, games, wr] = row.slice(42,-5).split('</td><td class="">')
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

const main = async () => {
    const browser = await puppeteer.launch();
    // const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.goto('https://17lands.com');

    // Set screen size
    await page.setViewport({width: 1080, height: 1024});

    let analyticsDropDownMenu,tableHandle,tableHTML

    //Click Analytics menu
    analyticsDropDownMenu = await page.waitForSelector('text/Analytics');
    await analyticsDropDownMenu.click();

    //Click Color Performance tab
    const colorPerformanceMenuTab = await page.waitForSelector('text/Color Performance');
    await colorPerformanceMenuTab.click();

    //Get tbody HTML
    tableHandle = await page.waitForSelector('tbody')
    tableHTML = await page.evaluate(el => el.innerHTML,tableHandle)

    //parse to get colorData
    let colorData = parseColorData(tableHTML)

    await tableHandle.dispose();
    await colorPerformanceMenuTab.dispose();
    await analyticsDropDownMenu.dispose();

    //Click Analytics menu
    analyticsDropDownMenu = await page.waitForSelector('text/Analytics');
    await analyticsDropDownMenu.click();

    //Click Recent Trophy tab
    const trophyTab = await page.waitForSelector('text/Recent Trophy');
    await trophyTab.click();

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
    // let platPlusBreakdown = {}, platToMythData = [...mythicData,...platinumData,...diamondData]
    let platPlusBreakdown = {}, platPlusData = [...mythicData,...diamondData]
    
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
        console.log(row)
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
    // console.log(colorData)
}

main()