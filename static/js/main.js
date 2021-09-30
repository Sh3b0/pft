'use strict';

const status = document.getElementsByClassName('notify')[0]
const progress = document.getElementsByClassName('progress')[0]
const progressFill = document.getElementsByClassName('progress-fill')[0]
const progressText = document.getElementsByClassName('progress-text')[0]
const inviteLink = document.getElementById('invite-link')
const conf = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

// Changing status
status.addEventListener('statusChange', e => {
    status.children[1].textContent = e.detail
    if (e.detail === "Not connected" || e.detail.includes('Error')) {
        status.firstElementChild.firstChild.src = cross_icon
        status.style.color = '#F44336'
    } else if (e.detail === 'Connected' || e.detail.includes('Complete')) {
        status.firstElementChild.firstChild.src = success_icon
        status.style.color = '#22AA3A'
    } else {
        status.firstElementChild.firstChild.src = info_icon
        status.style.color = '#2AB7CA'
    }
})
