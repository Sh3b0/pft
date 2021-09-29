'use strict';

const fileInput = document.getElementById('file-input')
let localConnection, sendChannel, latestOffer, fileMeta

// Creating local connection
window.onload = () => {
    try {
        localConnection = new RTCPeerConnection(conf)
    } catch (ReferenceError) {
        alert("Your browser doesn't support WebRTC, please use a different one to be able to use the app.")
        return
    }
    localConnection.onicecandidate = () => {
        latestOffer = localConnection.localDescription
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = sendFile
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

// Toggle send/invite button
function onFileInputChange() {
    if (!sendChannel) return
    fileMeta = {
        name: fileInput.files[0].name,
        size: fileInput.files[0].size,
        last_modified: fileInput.files[0].lastModified,
    }
    if (sendChannel && sendChannel.readyState === 'open') {
        sendFile()
    } else {
        put_offer()
    }
}


// SendButton functionality
function sendFile() {
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Connected"})
    )
    const fileReader = new FileReader();
    const chunkSize = 16000 // 262144
    if (fileInput.files.length === 0) return
    const file = fileInput.files[0]
    let so_far = 0

    // Reads chunkSize bytes of the file, starting from byte o
    const readChunk = o => {
        const slice = file.slice(o, o + chunkSize)
        fileReader.readAsArrayBuffer(slice)
    }

    // TODO: send file meta first
    sendChannel.send(JSON.stringify(fileMeta))
    readChunk(0)  // Start sending file
    progress.style.display = "flex"
    fileReader.onerror = e => {
        console.error('Error reading file: ', e)
        closeConnection()
    }

    // On reading a part of the file, we send that part
    fileReader.onload = sendChunk

    async function sendChunk() {
        await timeout(0.01)
        try {
            sendChannel.send(fileReader.result)
        } catch (DOMException) {
            status.dispatchEvent(
                new CustomEvent('statusChange', {detail: "Connection Error"})
            )
            return
        }
        so_far += fileReader.result.byteLength
        progressText.innerText = "Sending " + (so_far / file.size * 100).toFixed(2).toString() + "% ..."
        progressFill.style.width = (so_far / file.size * 100).toString() + "%"
        if (so_far === file.size) {
            status.dispatchEvent(
                new CustomEvent('statusChange', {detail: "Upload Complete!"})
            )
        }
        if (so_far < file.size) {
            readChunk(so_far)
        }
    }
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Gets hash code from a string
function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
}

// Puts SDP offer to API
function put_offer() {
    console.log("Putting offer...")
    let xhr = new XMLHttpRequest()
    let room_id = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + room_id
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(latestOffer.toJSON()))
    inviteLink.textContent = room_id.toString()
    inviteLink.style.color = "black"
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Waiting for receiver to join"})
    )
    console.log("Waiting for answer...")
    get_answer(0)
}

// Gets SDP answer from API
function get_answer(count) {
    if (count >= 1000) {
        alert("Room timed out (receiver didn't join). Please try again.")
        location.reload()
    }
    let xhr = new XMLHttpRequest()
    let room_id = hashCode(JSON.stringify(fileMeta))
    let room_link = document.location.origin + '/api/' + room_id
    xhr.open("GET", room_link, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {
            if (xhr.status !== 200) {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connection Error"})
                )
                return
            }
            let rsp = JSON.parse(JSON.parse(xhr.response))
            if (rsp.type === "answer" && localConnection.iceGatheringState === 'complete') {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connecting..."})
                )
                localConnection.setRemoteDescription(rsp)
                    .catch(() => status.dispatchEvent(
                        new CustomEvent('statusChange', {detail: "Connection Error"})
                    ))
            } else if (rsp.type === 'offer') {
                setTimeout(get_answer.bind(null, count + 1), 3000)
            }
        }
    }
}

// Closes Data Channel and local connection
function closeConnection() {
    if (sendChannel) {
        sendChannel.close()
        sendChannel = null
    }
    if (localConnection) {
        localConnection.close()
        localConnection = null
    }
    fileInput.disabled = false
}

window.onbeforeunload = closeConnection
fileInput.onchange = onFileInputChange