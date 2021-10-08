'use strict';
/* global successIcon, crossIcon, infoIcon */

export const status = document.querySelector('.notify')
export const progress = document.querySelector('.progress')
export const progressFill = document.querySelector('.progress-fill')
export const progressText = document.querySelector('.progress-text')
export const dragAreaFilled = document.querySelector(".drag-area-filled")
export const conf = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}
export let inviteLink = document.getElementById('invite-link')
export let fileText = document.querySelector('.filename')

// Main
export function init() {
    try {
        new RTCPeerConnection()
    } catch (ReferenceError) {
        document.body.innerHTML =
            "<h1>Your browser doesn't support WebRTC, please use a different one to be able to use the app.</h1>"
    }
    status.addEventListener('statusChange', onStatusChange)
}

// Changing status icons
function onStatusChange(e) {
    status.children[1].textContent = e.detail
    if (e.detail === "Not connected" || e.detail.includes('Error')) {
        status.firstElementChild.firstChild.src = crossIcon
        status.style.color = '#F44336'
    } else if (e.detail === 'Connected' || e.detail.includes('Uploaded') || e.detail.includes('Downloaded')) {
        status.firstElementChild.firstChild.src = successIcon
        status.style.color = '#22AA3A'
    } else {
        status.firstElementChild.firstChild.src = infoIcon
        status.style.color = '#2AB7CA'
    }
}

// Returns human-readable file sizes from bytes
export function formatBytes(bytes, decimals = 0) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024, dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Returns a filename where name or extension cannot exceed (limit) characters
export function getShortFileName(fullName, limit = 10) {
    if (fullName.lastIndexOf(".") !== 0 &&
        fullName.lastIndexOf(".") !== -1) {
        let fileName = fullName.slice(0, fullName.lastIndexOf("."))
        let fileExt = fullName.slice(fullName.lastIndexOf("."),)
        if (fileExt.length > limit)
            fileExt = fileExt.slice(0, limit + 1) + ".."
        if (fileName.length > limit)
            fileName = fileName.slice(0, limit + 1) + ".."
        return fileName + fileExt
    }
    if (fullName.length > limit) {
        return fullName.slice(0, limit + 1) + ".."
    }
    return fullName
}