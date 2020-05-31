var cheerio = require('cheerio');
var Promise = require('bluebird');
var rp = require('request-promise');
var fs = require('fs');
var _ = require('lodash');

Promise.promisifyAll(rp);

const baseUrl = 'https://www.bankmega.com/promolainnya.php';

promos = []
/*
{
    titleCategory: [{
        "title": title,
        "imageUrl": image,
        "period": period,
        "area": area,
        "link": link
    }]
}
 */
let linkCreditCard = '';
// [{
//         'title': '',
//         'link': '',
//         'totalPages' : 0
//     ]
linkSubcategories = []
/**
    [{title: val.title,
    link: val.link,
    totalPage: totalPage}]
 */
var getPage =  function (url) {

    var options = {
        uri: url,
        transform: function (body){
            return cheerio.load(body);
        }
    }

    console.log(`request to url ${url}`);

    $ = rp(options).catch( function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    })
    return $;
};


var writeResult = ($) => {
    fs.writeFileSync("./promospage.html", $.html());
    return $;
    // return [{subcategory, page}] categories
}

var getLinkCreditCard = ($) => {
    linkCreditCard = getLinkFromClickAction($, 'kartukredit');
    return $;
}

getLinkFromClickAction = ($, id) => {
    script_creditcard = $("#contentpromolain2 script").html();

    query = script_creditcard.match(patternLinkContentPromoJs(id))[1];
    return baseUrl+query;
}

var patternLinkContentPromoJs = (id) => {
    return new RegExp(id+'.+?load.+?\.promolainnya\.php(.+?)"', 'sm');
}

getPageCreditCard = () => {
    return getPage(linkCreditCard);
}

var getLinkSubcategory = ($) => {
    subcatpromo = $("#subcatpromo img", "#contentpromolain2");
    
    for (let idx=0; idx<subcatpromo.length; idx++){
        title = subcatpromo[idx].attribs.title;
        id = subcatpromo[idx].attribs.id;
        link = getLinkFromClickAction($, id);
        linkSubcategories.push({'title':title, 'link': link});
        
        promos[title] = [];
    }
    return linkSubcategories;
}

getTotalPage = ($) => {
    titleOnPage = $(".page_promo_lain")[1].attribs.title;
    pattern = /of ([0-9]+)/
    totalPage = titleOnPage.match(pattern)[1];
    return totalPage;
}

validateRouteDetailPromo = (route) => {
    // promo_detail.php?id=1828
    pattern = /promo.+/
    route = route.match(pattern)[0];
    console.log(route);
    return route;
}

var getLinkPages = (linkSubcategories) => {
        return Promise.map(linkSubcategories, function(val){
            console.log(val.link)
            return getPage(val.link).then(getTotalPage).then((totalPage)=>{        
                return {
                    title: val.title,
                    link: val.link,
                    totalPage: totalPage
                }
            }).catch(function(reason) {
                console.log('Handle rejected promise ('+reason+') here.');
            })
        })
}


var getLinkPromos = (linkSubcategories) => {
    return Promise.map(linkSubcategories, function (sub) {
        tmp = _.range(sub.totalPage);
        return Promise.map(tmp, function (idx){
            idx +=1;
            getPage(sub.link+"&page="+idx).then(getLinkPromo).then(getDetailPromo).catch(function(reason) {
                console.log('Handle rejected promise ('+reason+') here.');
            });
        }, {concurrency: 2});
})}

var getLinkPromo = ($) => {
    result = [];
    target = $("#promolain a");
    
    tmp = _.range(target.length);
    return Promise.map(tmp, function (idx){
        href = target[idx].attribs.href;
        href = validateRouteDetailPromo(href);
        url = "https://www.bankmega.com/"+href;
        return url;
    })
}

getDetailPromo = (linkPromos) => {
    return Promise.map(linkPromos, function (url){
        getPage(url).then(function ($){
            imageUrl = $(".keteranganinside img")[0].attribs.src;
            period_class = $(".periode b").text();
            console.log(period_class);
            area = $(".periode b").text();

            detail = {'imageUrl' : imageUrl,
                'period_class': period_class, 
                'area': area
            };
            // console.log(detail);
            return detail;
    }).catch(function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    }), {concurrency: 3}}).catch(function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    })
}

getPage(baseUrl).then(getLinkCreditCard).then(getPageCreditCard).then(writeResult).then(getLinkSubcategory)
    .then(getLinkPages)
    .then(getLinkPromos)
    .catch(function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    });