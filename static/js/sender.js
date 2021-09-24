const fileInput = document.getElementById('file-input')
const inviteLink = document.getElementById('invite-link')
const status = document.getElementById('status')
const progress = document.getElementsByClassName('progress')[0]
const progressFill = document.getElementsByClassName('progress-fill')[0]
const progressText = document.getElementsByClassName('progress-text')[0]
const copyLinkButton = document.getElementById('copy-link')

let localConnection, sendChannel, latestOffer, fileMeta

// TODO: Use https with gunicorn to allow link copy
// TODO: [Enhancement] resend ice candidates as they arrive to ensure connection stability.
// TODO: [Optional] check the possibility of increasing speed without breaking the connection.
// TODO: [Optional] add upload stats (elapsed time, MBs, upload rate) in sender.
// TODO: [Optional] allow sending multiple files in the same connection
// TODO: [Optional] check the possibility of pausing/continuing connection (detect and recover from packet loss)
// TODO: [Optional] Add automated tests

// Creating local connection
window.onload = () => {
    const conf = {
        iceServers: [
            {
                urls: ['stun:stun.l.google.com:19302']
            }, {
                url: 'turn:turn.anyfirewall.com:443?transport=tcp',
                credential: 'webrtc',
                username: 'webrtc'
            }]
    }
    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = () => {
        console.log("New ice candidate")
        latestOffer = localConnection.localDescription
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = sendFile
    sendChannel.onmessage = e => console.log("Message from peer: " + e.data)
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

// Toggle send/invite button
function onFileInputChange() {
    console.log('File input changed')
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
    const fileReader = new FileReader();
    const chunkSize = 16000
    if (fileInput.files.length === 0) return
    const file = fileInput.files[0]
    let so_far = 0

    // Reads chunkSize bytes of the file, starting from byte o
    const readChunk = o => {
        const slice = file.slice(o, o + chunkSize)
        fileReader.readAsArrayBuffer(slice)
    }
    readChunk(0)  // Start sending file
    progress.style.display = "flex"
    fileReader.onerror = e => {
        console.error('Error reading file: ', e)
        closeConnection()
    }

    // On reading a part of the file, we send that part
    fileReader.onload = sendChunk

    async function sendChunk() {
        await timeout(0.1)
        sendChannel.send(fileReader.result)
        so_far += fileReader.result.byteLength
        progressText.innerText = "Sending " + (so_far / file.size * 100).toFixed(2).toString() + "% ..."
        progressFill.style.width = (so_far / file.size * 100).toString() + "%"
        if (so_far === file.size) {
            status.textContent = "Upload Complete!"
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
    let roomId = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(Object.assign({}, latestOffer.toJSON(), fileMeta)))
    inviteLink.textContent = document.location.origin + '/r/' + roomId
    inviteLink.style.color = "black"
    get_answer()
}

// Gets SDP answer from API
function get_answer() {
    status.textContent = "Waiting for receiver to join"
    console.log("Getting answer...")
    let xhr = new XMLHttpRequest()
    let roomId = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {  // DONE
            // console.log("Response: " + xhr.response)
            let rsp = JSON.parse(JSON.parse(xhr.response))
            if (rsp.type === "answer") {
                status.textContent = "Connecting..."
                localConnection.setRemoteDescription(rsp)
                    .then(() => {
                        status.textContent = 'Connected'
                        return 0
                    })
                    .catch(() => status.textContent = 'Connection Error')
            } else if (rsp.type === 'offer') {
                setTimeout(get_answer, 1000)
            }
        }
    }
}

// Closes Data Channel
function closeConnection() {
    console.log('Closing Connection...')
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

// Copy link button functionality
copyLinkButton.onclick = () => {
    navigator.clipboard.writeText(document.getElementById("invite-link").textContent).then()
}

window.onbeforeunload = closeConnection
fileInput.onchange = onFileInputChange