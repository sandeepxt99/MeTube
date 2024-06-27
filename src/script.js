import { hide, show, insertingVideoList, fetchDate, fetchSubscriptionChannelData, fetchSubscriptionVideoData, numberToWord, customAlert, promise } from './utils.script.js'

// menu_list 
let prev_section = '', curr_section = '#main_section', maxResultsClicks = 1
const ui_section_arr = ['#main_section', '#searching', '#watch_later_section', '#subscription_section']
// search_btn
let filter_ui_one_time = true, video_data = [];




function themeMode(mode = 'event') {
    let currTheme = localStorage.getItem('theme') || 'light'
    if (mode == 'initial') currTheme = currTheme == 'dark' ? 'light' : 'dark'
    if (currTheme == 'dark') {
        document.documentElement.style.setProperty('--main-background-color', 'white')
        document.documentElement.style.setProperty('--main-text-color', 'black');
        document.documentElement.style.setProperty('--border-color', 'black');
        document.querySelector('#theme_mode').innerHTML = 'Dark';
        currTheme = 'light'
    }
    else {
        document.documentElement.style.setProperty('--main-background-color', 'black')
        document.documentElement.style.setProperty('--main-text-color', 'white');
        document.documentElement.style.setProperty('--border-color', 'white');
        document.querySelector('#theme_mode').innerHTML = 'Light';
        currTheme = 'dark'
    }
    localStorage.setItem('theme', currTheme)
}
themeMode('initial') // by default 

function watchLater() {
    loading('#watch_later_portion')
    const watchLaterList = JSON.parse(localStorage.getItem('watchLaterList')) || [];
    promise(() => insertingVideoList('#watch_later_portion', watchLaterList))
        .then(_ => { })
        .catch(_ => {
            loading('#watch_later_portion', 'end');
            customAlert("Can't find watch later videos", 'fail');
        })

}

function viewChannelUI(channel) {
    let channelClone = document.querySelector('#view_channel_template').content.cloneNode(true)
    channelClone.querySelector('img').setAttribute('src', channel.url)
    channelClone.querySelector('img').setAttribute('alt', channel.title)
    channelClone.querySelector('h2').innerText = channel.title
    channelClone.querySelector('details p').innerText = channel.description
    let p = channelClone.querySelectorAll('#text_box p')
    p[0].innerText = channel.customUrl
    p[1].innerText = numberToWord(channel.subscriberCount) + ' subscribers'
    p[2].innerText = numberToWord(channel.videoCount) + ' videos'
    p[3].innerText = numberToWord(channel.viewCount) + ' views'
    p[4].innerText = 'Joined ' + (new Date(channel.publishedAt)).toDateString().slice(4)

    channelClone.querySelector('button').addEventListener('click', () => {
        document.querySelector('#view_channel_portion').innerHTML = ''
        show(['#subscription_portion'])
    })

    document.querySelector('#view_channel_portion').appendChild(channelClone)
    channelClone = null;
}

async function subscription() {
    let data = await fetchSubscriptionChannelData()
    if (data == null) return customAlert('No subscribed channel found', 'info')
    let clientWidth = window.innerWidth
    let subs_cards = ''
    data.forEach((channel) => {
        subs_cards += `<div> <img class='logo' src='${channel.url}'  alt='${channel.title}' />  
         <p>${clientWidth > 700 ? channel.title.slice(0, 10) + '...' : channel.title.slice(0, 7) + '...'} </p></div>`
    })
    document.querySelector('#channel_portion').innerHTML = subs_cards
    subs_cards = null;
    let channels = document.querySelectorAll('#channel_portion div')
    let prev = '', curr = '', items = [], items_map = {};

    channels.forEach(async (channel, idx) => {
        let one_time = true, items_idx = 0;
        channel.addEventListener('click', async () => {
            prev = curr;
            curr = channel
            if (prev == curr) return;
            prev && prev.classList.remove('channel_selected')
            curr.classList.add('channel_selected')
            loading('#video_list_portion')
            if (one_time) {
                promise(() => fetchSubscriptionVideoData(data[idx].channel_id))
                    .then((res) => {
                        items.push(res)
                        items_idx = items.length - 1
                        items_map[data[idx]?.title.trim()] = idx;
                        one_time = false;
                        insertingVideoList('#video_list_portion', items[items_idx]);
                    })
                    .catch(_ => loading('#video_list_portion', 'end'), customAlert("Can't find", 'fail'))
            }
            else insertingVideoList('#video_list_portion', items[items_idx]);
        })
    })
    // view channel 
    document.querySelector('#channel_btn').addEventListener('click', () => {
        if (!curr) return customAlert('Please select one channel', 'fail');
        viewChannelUI(data[items_map[curr.querySelector('img').getAttribute('alt').trim()]])
        hide(['#subscription_portion'])

    })
    // 
}

function menu_select(selector) {
    //selector = selector.toLowerCase()
    switch (selector) {
        case 0:
            break;

        case 1:
            break;

        case 2:
            watchLater()
            break;

        case 3:
            subscription()
            break;
        default:
            break;
    }
}

function menu_list(selector) {
    let menu = document.querySelectorAll(selector)
    let video_player = document.querySelector('#video_player')
    for (let i = 0; i < menu.length - 1; i++) {
        let one_time = true
        menu[i].addEventListener('click', () => {
            // if (video_player.children.length) {

            // }
            prev_section = curr_section;
            curr_section = ui_section_arr[i]
            hide([prev_section])
            show([curr_section])
            if (one_time) menu_select(i), one_time = false
        })
    }

    // dark mode handel 
}

async function search_btn() {
    let query = document.querySelector('#search_box').value || '';
    if (query) {
        document.querySelector('#searching_result').innerText = query
        loading('#main')
        prev_section = curr_section;
        curr_section = ui_section_arr[0]
        hide([prev_section])
        show([curr_section])
        promise(() => fetchDate(query, {}))
            .then((res) => {
                video_data = res
                res = null;
                document.querySelector('#search_box').value = ''
                if (filter_ui_one_time) {
                    filterUI_2();
                    show(['#header_2', '#pagination'])
                    filter_ui_one_time = false;
                }
                maxResultsClicks = 1;
            })
            .catch(_ => customAlert("Can't search", 'fail'))
    }
    else return customAlert('Please Enter Query ', 'warning')
}

function search_cancel_btn() {
    let temp_prev = prev_section
    prev_section = curr_section;
    curr_section = temp_prev
    hide([prev_section])
    show([curr_section])
}

document.querySelector('#search_btn').addEventListener('click', search_btn)
document.querySelector('#search_cancel_btn').addEventListener('click', search_cancel_btn)

function filterUI(values) {
    let customSelectClone = document.querySelector('#custom_select_template').content.cloneNode(true);
    values.forEach((val, idx) => {
        let option = document.createElement('option');
        option.value = idx == 0 ? '' : val?.toLowerCase();
        option.textContent = val;
        customSelectClone.querySelector('select').appendChild(option)
    })
    document.querySelector('#filter').appendChild(customSelectClone)
    customSelectClone = null;
}

function filterUI_2() {
    let values = [
        ['Sort By', 'Relevance', 'Upload date', 'View count', 'Rating'],
        ['Type', 'All', 'Video', 'Channel', 'Playlist', 'Film'],
        ['Upload date', 'Any time', 'Last hour', 'Today', 'This week', 'This month', 'This year'],
        ['Duration', 'Any', 'Under 4 minutes', '4-20 minutes', 'Over 20 minutes']
    ]

    document.querySelector('#filter').innerHTML = ''
    values.forEach(val => { filterUI(val) })
    values = null;
    let btn = `<button class='box' id='apply_filter_btn' >Apply</button>`
    document.querySelector('#filter').innerHTML += btn;
    document.querySelector('#apply_filter_btn').addEventListener('click', filter_apply_btn)

}
function get_filter() {
    const filter = {}
    const selects = document.querySelector('#filter').querySelectorAll('select')
    selects.forEach((item, idx) => {
        if (item.value) {
            item = item.value.toLowerCase();
            switch (idx) {
                case 0:
                    let order = ''
                    for (let i = 0; i < item.length; i++) {
                        if (item[i] == ' ') {
                            if (i + 1 < item.length) order += item[++i].toUpperCase()
                        }
                        else order += item[i]
                    }
                    if (order == 'uploadDate') order = 'date'
                    filter['order'] = order;
                    break;
                case 1:
                    let type = 'video'
                    if (item != 'all' && item != 'film') type = item
                    filter['type'] = type;
                    break;
                case 2:
                    let publishedAfter = ''
                    const date = new Date()
                    let y = date.getFullYear()
                    let m = date.getMonth()
                    let d = date.getDate()
                    let h = date.getHours()
                    let min = date.getMinutes()
                    let s = date.getSeconds()

                    if (item.includes('year')) y--
                    else if (item.includes('month')) m--;
                    else if (item.includes('week')) d = d - 7;
                    else if (item.includes('today')) d--
                    else if (item.includes('hour')) h--
                    publishedAfter = `${y}-${m}-${d}T${h}:${min}:${s}Z`
                    filter['publishedAfter'] = publishedAfter;
                    break;
                case 3:
                    let videoDuration = 'any'
                    if (item.includes('4-20')) videoDuration = 'medium'
                    else if (item.includes('4')) videoDuration = 'short'
                    else if (item.includes('20')) videoDuration = 'long'
                    filter['videoDuration'] = videoDuration;
                    break;
                default:
                    break;
            }
        }
    })
    return filter
}
// filter apply btn 
function filter_apply_btn() {
    let filter = get_filter()
    let q = document.querySelector('#searching_result').innerHTML
    if (q) fetchDate(q, filter)
}

document.querySelector('#header_2 button:first-child').addEventListener('click', () => {
    console.log('search')
    document.querySelector('#searching_result').classList.toggle('active')
})
document.querySelector('#header_2 button:last-child').addEventListener('click', () => {
    console.log('filter')
    document.querySelector('#filter').classList.toggle('active')

})

async function next_page_token() {
    if (maxResultsClicks < 5) {
        maxResultsClicks++;
        insertingVideoList('#main', video_data.slice((maxResultsClicks - 1) * 10, maxResultsClicks * 10))
        document.querySelector('#curr').innerHTML = maxResultsClicks
    }
    else return customAlert('No more videos', 'info')
}
function prev_page_token() {
    if (maxResultsClicks > 1) {
        maxResultsClicks--;
        insertingVideoList('#main', video_data.slice((maxResultsClicks - 1) * 10, maxResultsClicks * 10))
        document.querySelector('#curr').innerHTML = maxResultsClicks
    } else return customAlert('No more videos', 'info')
}

document.querySelector('#next').addEventListener('click', next_page_token)
document.querySelector('#prev').addEventListener('click', prev_page_token)



function loading(selector, mode = 'start') {
    if (mode == 'start') {
        document.querySelector(selector).innerHTML = `<div id="spinner" class="spinner"></div>`
    }
    else {
        let img = `<img class="not_found_img" src="./assest/page-not-found.png" alt="page-not-found" />`
        document.querySelector(selector).innerHTML = img
    }
}

function main() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service_worker.js").then(registration => {
            console.log("");
        }).catch(_ => {
            customAlert("SW Registration Failed", 'fail');
        });
    } else {
        customAlert("Not supported", 'fail');
    }

    if (window.innerWidth >= 769) {
        menu_list('#menu_ul li')
        document.querySelector('#theme_mode').addEventListener('click', themeMode)
    }
    else {
        menu_list('#bottom_menu svg')
        document.querySelector('#theme_icon').addEventListener('click', themeMode)
    }
}

main()

 