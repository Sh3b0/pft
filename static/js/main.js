'use strict';

window.onload = () => {
    try {
        new RTCPeerConnection()
    } catch (ReferenceError) {
        document.body.innerHTML =
            "<h1>Your browser doesn't support WebRTC, please use a different one to be able to use the app.</h1>"
    }
}

// Changing status
status.addEventListener('statusChange', e => {
    status.children[1].textContent = e.detail
    if (e.detail === "Not connected" || e.detail.includes('Error')) {
        status.firstElementChild.firstChild.src = crossIcon
        status.style.color = '#F44336'
    } else if (e.detail === 'Connected' || e.detail.includes('Complete')) {
        status.firstElementChild.firstChild.src = successIcon
        status.style.color = '#22AA3A'
    } else {
        status.firstElementChild.firstChild.src = infoIcon
        status.style.color = '#2AB7CA'
    }
})
