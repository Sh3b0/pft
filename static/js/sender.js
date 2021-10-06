'use strict';
import {
    init,
    getShortFileName,
    formatBytes,
    status,
    conf,
    progress,
    progressFill,
    progressText,
    dragAreaFilled,
    fileText,
    inviteLink,
} from "/static/js/common.js"

const fileInput = document.getElementById('file-input')
const browseLabel = document.querySelector('.browse-file')
const dragArea = document.querySelector(".drag-area")

let textSpan = document.getElementById("or")
let dragText = document.querySelector(".drag-header")
let localConnection, sendChannel, latestOffer, chunkSize

// Creating local connection
window.onload = () => {
    init()
    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = e => {
        latestOffer = localConnection.localDescription
        if (sendChannel.readyState === 'open' && e.candidate)
            sendChannel.send(JSON.stringify({ice: e.candidate}))
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = () => {
        status.dispatchEvent(
            new CustomEvent('statusChange', {detail: "Connected"})
        )
        if (fileInput.files.length !== 0) {
            progress.style.display = "flex"
            sendFiles().then()
        }
    }
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
    window.onbeforeunload = closeConnection
    dragArea.addEventListener("dragover", onDragOver)
    dragArea.addEventListener("dragleave", resetDrag)
    dragArea.addEventListener('drop', fileUploading)
    fileInput.addEventListener('change', fileUploading)
}


// Reads one chunk of the file
function readChunkAsync(chunk) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result)
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(chunk)
    })
}

// Resolves on ACK message from receiver (for each chunk)
function awaitACK() {
    return new Promise((resolve, reject) => {
        sendChannel.onmessage = e => {
            if (e.data === 'ACK') resolve()
            else reject()
        }
    })
}

// Sends all files in fileInput through an open sendChannel
async function sendFiles() {
    fileInput.disabled = true
    for (let i = 0; i < fileInput.files.length; i++) {
        let file = fileInput.files[i]
        sendChannel.send(JSON.stringify({name: file.name, size: file.size}))
        fileText.firstChild.textContent = getShortFileName(file.name)
        fileText.children[1].textContent = `(${formatBytes(file.size)})`
        for (let bytesSent = 0; bytesSent <= file.size; bytesSent += chunkSize) {
            let chunk = await readChunkAsync(file.slice(bytesSent, bytesSent + chunkSize))
            sendChannel.send(chunk)
            let percentage = (bytesSent / file.size * 100).toFixed(2)
            progressText.innerText = `Sending file ${i + 1}/${fileInput.files.length} - ` +
                `${formatBytes(bytesSent)} Uploaded`
            progressFill.style.width = percentage + "%"
            await awaitACK()
        }
        status.dispatchEvent(
            new CustomEvent('statusChange', {detail: `Uploaded ${i + 1} file(s)`})
        )
    }
    progressText.innerText = ""
    progress.style.display = "none"
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: `Uploaded ${fileInput.files.length} file(s)`})
    )
    resetDrag(null)
    fileInput.disabled = false
}

// Puts SDP offer to API
function putOffer() {
    console.log("Putting offer...")
    let roomId = Math.floor(Math.random() * 9e9 + 1e9)
    let roomLink = document.location.origin + '/api/' + roomId
    let xhr = new XMLHttpRequest()
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(latestOffer.toJSON()))
    inviteLink.textContent = roomId.toString()
    inviteLink.style.color = "black"
    status.dispatchEvent(
        new CustomEvent('statusChange', {detail: "Waiting for receiver to join"})
    )
    console.log("Waiting for answer...")
    getAnswer(0, roomId)
}

// Gets SDP answer from API
function getAnswer(count, roomId) {
    if (count >= 1000) {
        alert("Room timed out (receiver didn't join). Please try again.")
        location.reload()
    }
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {
            if (xhr.status !== 200) {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connection Error. Please try again."})
                )
                return
            }
            let rsp
            try {
                rsp = JSON.parse(JSON.parse(xhr.response))
            } catch (SyntaxError) {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connection Error. Please try again."})
                )
                return
            }
            if (rsp.type === "answer" && localConnection.iceGatheringState === 'complete') {
                status.dispatchEvent(
                    new CustomEvent('statusChange', {detail: "Connecting..."})
                )
                localConnection.setRemoteDescription(rsp)
                    .catch(() => status.dispatchEvent(
                        new CustomEvent('statusChange', {detail: "Connection Error. Please try again."})
                    ))
                chunkSize = 16384
                const match = rsp.sdp.match(/a=max-message-size:\s*(\d+)/)
                if (match !== null && match.length >= 2) {
                    chunkSize = Math.max(chunkSize, parseInt(match[1]))
                }
            } else if (rsp.type === 'offer') {
                setTimeout(getAnswer.bind(null, count + 1, roomId), 3000)
            }
        }
    }
}

// Called when user drops files on dragArea, or changes file using Browse button
// Changes UI to show the file and creates room (or immediately send file if channel is already open)
function fileUploading(e) {
    e.preventDefault()
    dragArea.style.display = "none"
    dragAreaFilled.style.display = "flex"
    dragArea.classList.remove("active")
    if (e.dataTransfer) fileInput.files = e.dataTransfer.files
    if (fileInput.files.length > 1) {
        let total_size = 0
        fileText.firstChild.textContent = fileInput.files.length + " files"
        for (let i = 0; i < fileInput.files.length; i++) total_size += fileInput.files[i].size
        fileText.children[1].textContent = `(${formatBytes(total_size)})`
    } else {
        fileText.firstChild.textContent = getShortFileName(fileInput.files[0].name)
        fileText.children[1].textContent = `(${formatBytes(fileInput.files[0].size)})`
    }
    if (sendChannel && sendChannel.readyState === 'open' && fileInput.files.length !== 0) {
        status.dispatchEvent(
            new CustomEvent('statusChange', {detail: "Connected"})
        )
        progress.style.display = "flex"
        sendFiles().then()
    } else {
        putOffer()
    }
}

// Adjusts UI on dragArea leave or file upload complete
function resetDrag(e) {
    if (e) e.preventDefault()
    dragAreaFilled.style.display = "none"
    dragArea.style.display = "flex"
    browseLabel.style.display = "flex"
    textSpan.style.display = "flex"
    dragArea.classList.remove("active")
    dragText.textContent = "Drag & Drop to Upload File(s)"
}

// Adjusts UI on dragArea enter
function onDragOver(e) {
    e.preventDefault()
    browseLabel.style.display = "none"
    textSpan.style.display = "none"
    dragArea.classList.add("active")
    dragText.textContent = "Release to upload file(s)"
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
