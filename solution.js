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

/* how to change from 
[
    [sub
        [page
            {detail},
            {detail}
        ],
    ],
]
to 
[
    title category: [detail],

]
*/

// return list of categories,page
var getPage =  function (url) {
    // var url = `${baseUrl}?product=0&subcat=${subcategory}&page=${page}`;
    // var url = `${baseUrl}`;

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


var writePage = ($) => {
    fs.writeFileSync("./promospage.html", $.html());
    return $;
    // return [{subcategory, page}] categories
}

var writeResult = (json) => {
    fs.appendFileSync("./solution.json", JSON.stringify(json));
    return json;
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
    
    let linkSubcategories = [];

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
    console.log("sini, ", totalPage);
    return totalPage;
}

var getLinkPages = (linkSubcategories) => {
    return Promise.map(linkSubcategories, function (subcategory){
        return getPage(subcategory.link).then(getTotalPage).then(
            function (totalPages){
                    linkPromos = _.range(totalPage);
                    console.log("sono, ", totalPage);
                    return Promise.map(linkPromos, function (linkPromo, idx){
                        page = idx+1;
                        return getPage(subcategory.link+"&page="+page).then(getLinkPromo);
                    })
                    }
        )
        })
        

    
        // return Promise.map(linkSubcategories, function(val){
        //     console.log(val.link)
        //     return getPage(val.link).then(getTotalPage).then((totalPage)=>{        
        //         return {
        //             title: val.title,
        //             link: val.link,
        //             totalPage: totalPage
        //         }
        //     }).catch(function(reason) {
        //         console.log('Handle rejected promise ('+reason+') here.');
        //     })
        // })
}


var getLinkPromos = function (totalPages){
    return Promise.map(totalPages, function (totalPage){
        linkPromos = _.range(totalPage);
        console.log(totalPage);
        return Promise.map(linkPromos, function (linkPromo){
            getPage(sub.link+"&page="+idx);
            return getLinkPromo
        })
        }
    )
}

// (linkSubcategories) => {
//     return Promise.map(linkSubcategories, function (sub) {
//         tmp = _.range(sub.totalPage);
//         return Promise.map(tmp, function (idx){
//             idx +=1;
//             getPage(sub.link+"&page="+idx).then(getLinkPromo).then(function (val){
//                 return {
//                     title: sub.title,
//                     link: sub.link,
//                     totalPage: sub.totalPage,
//                     linkPromos : val
//                 }
//             }).then(function (val){console.log(val)})
//         });
// })}

var getLinkPromo = ($) => {
    result = [];
    target = $("#promolain a");
    
    tmp = _.range(target.length);
    return Promise.map(tmp, function (idx){
        href = target[idx].attribs.href;
        url = "https://www.bankmega.com/"+href;
        return url;
    })
}

getDetailPromo = (linkPromos) => {
        Promise.map(linkPromos, function (category){
            return Promise.map(category, function (page) {
                return Promise.map(page, function (url){
                    getPage(url).then(function ($){
                        imageUrl = baseUrl+$(".keteranganinside img")[0].attribs.src;
                        period_class = $(".periode b").text();
                        console.log(period_class);
                        area = $(".periode b").text();
            
                        result = {'imageUrl' : imageUrl,
                            'period_class': period_class, 
                            'area': area
                        }
                        console.log(result);
                        return result;
                })
                })
            }
        ).catch(function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    })
})
}

// categories = [link to every categories]
getPage(baseUrl)
    .then(getLinkCreditCard)
    .then(getPageCreditCard)
    .then(getLinkSubcategory)
    .then(getLinkPages)
    .then(getDetailPromo)
    .then(function (val){console.log("abis ");console.log(val);return val;})
    .then(writeResult)
    .then(function (val){console.log("abis ");console.log(val)})
    .catch(function(reason) {
        console.log('Handle rejected promise ('+reason+') here.');
    });
