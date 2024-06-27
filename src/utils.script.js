
function hide(selectors) {
    selectors.forEach(selector => {
        document.querySelector(selector).style.display = 'none';
    });
}

function show(selectors, displayValue = 'flex') {
    // selector = [selectorName, displayValue]
    if (typeof (displayValue) == 'string') {
        selectors.forEach((selector, idx) => {
            document.querySelector(selector).style.display = displayValue
        });
    }
    else {
        selectors.forEach((selector, idx) => {
            document.querySelector(selector).style.display = displayValue[idx]
        });
    }
}

function insertingVideoList(selector, items) {
    if (items.length <= 0) {
        document.querySelector(selector).innerHTML = `<img src='./assest/page-not-found.svg' alt='not_found' />`
        return null;
    }
    let videoCardTemplate = document.querySelector('#video_card_template');
    let fragement = document.createDocumentFragment();
    let selector_2 = '#subscription_section';
    if (selector == '#main') selector_2 = '#main_section'
    else if (selector == '#watch_later_portion') selector_2 = '#watch_later_section'

    let limit = 45, width = window.innerWidth
    if (width >= 300 && width <= 500) limit = 55
    else if (width > 500) limit = 70

    const subscriptionList = JSON.parse(localStorage.getItem('subscriptionList')) || [] // for checking subscribe and unsubscribe 

    items.forEach((item) => {
        const clone = videoCardTemplate.content.cloneNode(true);
        clone.querySelector('img').src = item.img;
        clone.querySelector('img').alt = item.alt;
        clone.querySelector('.title').textContent = `${item.title.slice(0, limit)}${item.title.length > limit ? '...' : ''}`
        clone.querySelector('.channel_name').textContent = item.channel_name;
        clone.querySelector('.views').textContent = numberToWord(item.views);
        clone.querySelector('.date').textContent = timeToDuration(item.date);
        clone.querySelector('div').addEventListener('click', () => {
            let channelId = false
            for (let i = 0; i < subscriptionList.length; i++) {
                if (subscriptionList[i] == item.channel_id) {
                    channelId = true;
                    break
                }
            }
            playingVideo(item, selector_2, channelId)
        });
        fragement.appendChild(clone);
    })
    document.querySelector(selector).innerHTML = ''
    document.querySelector(selector).append(fragement)
    fragement = null;
    return true
}

function playingVideo(item, selector, channelId = false) {
    hide([selector])
    let videoPlayer = document.querySelector('#video_player');
    // if video already playing
    if (videoPlayer.querySelector('.title')?.innerHTML == item.title) return null;

    let videoClone = document.querySelector('#video_template').content.cloneNode(true);
    videoClone.querySelector('iframe').src = `https://www.youtube.com/embed/${item?.video_id}`;
    videoClone.querySelector('iframe').title = item.title || '';
    videoClone.querySelector('.title').innerHTML = item.title;
    videoClone.querySelector('.likes').innerHTML = numberToWord(item.likes) + ' likes';
    videoClone.querySelector('.views').innerHTML = numberToWord(item.views) + ' views';
    videoClone.querySelector('.date').innerHTML = timeToDuration(item.date);
    videoClone.querySelector('.description').innerHTML = item.description;

    videoClone.querySelector('.cancel_btn').addEventListener('click', () => {
        videoPlayer.innerHTML = '';
        show([selector])
    })
    let btn = document.createElement('button')
    btn.classList.add('box')
    if (selector == '#watch_later_section') {
        btn.innerHTML = 'Unsave'
        btn.addEventListener('click', () => {
            removeWatchLaterList(item.video_id)
        })
    }
    else {
        btn.innerHTML = 'Save'
        btn.addEventListener('click', () => {
            addWatchLater(item)
        })
    }
    videoClone.querySelector('.video_player_buttons').appendChild(btn)

    let btn_2 = document.createElement('button')
    btn_2.classList.add('box')

    if (channelId) {
        btn_2.innerHTML = 'Unsubscribe'
        btn_2.addEventListener('click', () => {
            let subscriptionList = JSON.parse(localStorage.getItem('subscriptionList')) || []
            subscriptionList = subscriptionList.filter(id => id != channelId)
            localStorage.setItem('subscriptionList', JSON.stringify(subscriptionList))
            subscriptionList = null;
            customAlert('Unsubscribed')
        })
    }
    else {
        btn_2.innerHTML = 'Subscribe'
        btn_2.addEventListener('click', () => {
            const subscriptionList = JSON.parse(localStorage.getItem('subscriptionList')) || []

            subscriptionList.push(item.channel_id)
            localStorage.setItem('subscriptionList', JSON.stringify(subscriptionList))
            customAlert('Subscribed')
        })
    }
    videoClone.querySelector('.video_player_buttons').appendChild(btn_2)
    videoPlayer.innerHTML = '';
    videoPlayer.appendChild(videoClone)
    return true;
}

async function fetchingVideoList(params) {
    const API_KEY = 'XXXXX-XXXX'; // youtube v3 api key
    const URL = 'https://www.googleapis.com/youtube/v3';
    params['key'] = API_KEY
    params = new URLSearchParams(params)
    try {
        let response = await fetch(`${URL}/search?${params}`);
        response = await response.json();

        // 
        params = new URLSearchParams({
            part: 'snippet,statistics',
            id: response.items.map(item => item.id.videoId).join(','),
            key: API_KEY,
        })
        response = await fetch(`${URL}/videos?${params}`);
        response = await response.json();
        let data = response?.items.map((item) => ({
            'video_id': item.id,
            'img': item.snippet.thumbnails.medium.url,
            // 'alt': item.snippet.title,
            'title': item.snippet.title,
            'channel_id': item.snippet.channelId,
            'channel_name': item.snippet.channelTitle,
            'views': item.statistics.viewCount,
            'date': new Date(item.snippet.publishedAt).getFullYear(),
            'description': item.snippet.description,
            'likes': item.statistics.likeCount
        }))
        response = null;
        params = null;

        return data
    } catch (err) {
        return null;
    }
}
async function fetchDate(query = '', filter = {},) {
    let params = {
        part: 'snippet',
        q: query,
        maxResults: 50,
        type: filter?.type || 'video',
        videoDuration: filter?.videoDuration || 'any',
        order: filter?.order || 'relevance',
        publishedAfter: filter?.publishedAfter || '1970-01-01T00:00:00Z'
    };
    let data = await fetchingVideoList(params)

    if (data == null) return null
    insertingVideoList('#main', data.slice(0, 10))
    params = null;
    return data
}

async function fetchSubscriptionChannelData() {
    const URI = 'https://www.googleapis.com/youtube/v3/channels'
    const API_KEY = 'xxxxx-xxxx'; // youtube v3 api 
    let subscriptionList = JSON.parse(localStorage.getItem('subscriptionList')) || []
    if (subscriptionList.length == 0) return null;
    let params = {
        key: API_KEY,
        part: 'snippet,statistics',
        id: subscriptionList.map(id => id).join(','),
        maxResults: 50
    }
    params = new URLSearchParams(params);
    try {
        let data = await fetch(`${URI}?${params}`)
        data = await data.json()
        data = data.items.map(item => ({
            'channel_id': item.id,
            'title': item.snippet.title,
            'description': item.snippet.description,
            'customUrl': item.snippet.customUrl,
            'publishedAt': item.snippet.publishedAt,
            'url': item.snippet.thumbnails.medium.url,
            "viewCount": item.statistics.viewCount,
            "subscriberCount": item.statistics.subscriberCount,
            "videoCount": item.statistics.videoCount
        }))
        return data
    } catch (error) {
        return [];
    }
}
async function fetchSubscriptionVideoData(channelId) {
    if (!channelId) return null
    let date = new Date()
    let params = {
        'part': 'snippet',
        'maxResults': 50,
        'order': 'date',
        'channelId': channelId,
        'publishedAfter': `${date.getFullYear()}-01-01T00:00:00Z`
    }
    let data = await fetchingVideoList(params)
    params = null;
    return data
}
export {
    show,
    hide,
    insertingVideoList,
    playingVideo,
    fetchDate,
    fetchSubscriptionChannelData,
    fetchSubscriptionVideoData,
    numberToWord,
    customAlert,
    promise
}

function numberToWord(num) {
    num = Number(num)
    if (parseFloat(num / Math.pow(10, 9)) >= 1) {
        return `${parseInt(num / Math.pow(10, 9))}B`
    } else if (parseFloat(num / Math.pow(10, 6)) >= 1) {
        return `${parseInt(num / Math.pow(10, 6))}M`
    } else if (parseFloat(num / Math.pow(10, 3)) >= 1) {
        return `${parseInt(num / Math.pow(10, 3))}K`
    } else {
        return `${num}`
    }
}

function timeToDuration(time) {
    time = Number(time)
    let date = new Date()
    if (date.getFullYear() - time) {
        return `${date.getFullYear() - time} Year ago`
    } else {
        return `${time} Year `
    }
}

function addWatchLater(video) {
    const watchLaterList = JSON.parse(localStorage.getItem('watchLaterList')) || [];

    for (let i = 0; i < watchLaterList.length; i++) {
        if (watchLaterList[i].video_id == video.video_id) return customAlert('Added successfully')
    }

    watchLaterList.push(video);
    if (watchLaterList.length > 10) watchLaterList.shift()
    localStorage.setItem('watchLaterList', JSON.stringify(watchLaterList));
    return customAlert('Added successfully')
}

function removeWatchLaterList(video_id) {
    let watchLaterList = JSON.parse(localStorage.getItem('watchLaterList')) || [];
    watchLaterList = watchLaterList.filter((item) => item.video_id !== video_id);
    localStorage.setItem('watchLaterList', JSON.stringify(watchLaterList));
    return customAlert('Remove Successfully');
}

function customAlert(text = '', type = 'info') {

    function fn() {
        document.querySelector('body').removeChild(document.querySelector('.alert'));
    }
    let alert = document.querySelector('.alert')
    if (alert != null) fn();
    let color = '#2196F3'
    if (type == 'fail') color = '#f44336'
    else if (type == 'success') color = '#04AA6D'
    else if (type == 'warning') color = '#ff9800'

    alert = document.createElement('div')
    alert.classList.add(['alert'])
    let p = document.createElement('p')
    p.innerHTML = text
    alert.appendChild(p)

    let close_btn = document.createElement('span')
    close_btn.innerHTML = `✖`
    close_btn.classList.add(['closebtn'])
    close_btn.addEventListener('click', fn)

    alert.style.backgroundColor = color;
    alert.appendChild(close_btn)
    setTimeout(fn, 3000);
    document.querySelector('body').appendChild(alert)

}

function promise(func) {
    return new Promise(async (resolve, reject) => {
        let data = await func()
        if (data != null) return resolve(data)
        return reject(data)
    })
}


// 209