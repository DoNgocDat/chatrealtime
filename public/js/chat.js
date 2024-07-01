$(function () {
    const socket = io.connect('http://localhost:3000');

    let username;
    socket.on("username", function (name) {
        username = name;
        $('#username').text(username);
    });

    // Lắng nghe sự kiện "send" từ server và hiển thị tin nhắn
    socket.on("send", function (data) {
        console.log("Received data: ", data);  // Thêm log để kiểm tra dữ liệu nhận được
        const messageClass = (data.username === username) ? "self" : "others";
        let messageContent = data.message;

        if (data.type === 'file') {
            // Kiểm tra xem file có phải là hình ảnh không
            const fileExtension = data.message.split('.').pop().toLowerCase();
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];

            if (imageExtensions.includes(fileExtension)) {
                messageContent = `<img src="${data.message}" style="max-width: 100%; height: auto;" />`;
            } else {
                messageContent = `<a href="${data.message}" target="_blank">Download file</a>`;
            }
        }

        if (data.username === username) {
            data.username = "Bạn";
        }

        $("#content").append(
            "<div class='message " + messageClass + "'><strong>" + data.username + "</strong> <br> " + messageContent + "</div>" +
            "<div class='clear'></div>"
        );
        $('#content').scrollTop($('#content')[0].scrollHeight);
        $('#emptyMessage').hide();

    });

    // Gửi tin nhắn khi nhấn nút "SEND"
    $("#sendMessage").on('click', function () {
        sendMessage();
        // Ẩn bảng biểu tượng cảm xúc
        $("#emojiPanel").hide();
        $('#message').val('');
        $('#emptyMessage').hide();
    });

    // Gửi tin nhắn khi nhấn phím "Enter"
    $("#message").keypress(function (event) {
        if (event.keyCode === 13) {
            sendMessage();
            // Ẩn bảng biểu tượng cảm xúc 
            $("#emojiPanel").hide();
            $('#message').val('');
            $('#emptyMessage').hide();
        }
    });

    // Hàm gửi tin nhắn
    function sendMessage() {
        const message = $('#message').val();
        const fileInput = document.getElementById('fileInput');

        if (fileInput.files.length > 0) {
            sendFile(fileInput.files[0]);
            fileInput.value = ''; // Reset file input
            return; // Thoát khỏi hàm sau khi gửi file
        }

        if (message.trim() === '') {
            alert('Vui lòng nhập nội dung tin nhắn !!');
            return; // Thoát khỏi hàm nếu không có tin nhắn
        }

        socket.emit('send', { username: username, message: message, type: 'text' });
        $('#message').val('');
    }

    // Thêm sự kiện click vào nút icon để mở hoặc đóng bảng biểu tượng cảm xúc
    $("#openEmojiPanel").on('click', function () {
        $("#emojiPanel").toggle();
    });

    // Thêm sự kiện click vào các ô chứa biểu tượng cảm xúc
    $(".emoji").on('click', function () {
        const emoji = $(this).text(); // Lấy emoji từ văn bản trong ô
        insertEmoji(emoji);
    });

    // Chèn biểu tượng cảm xúc vào tin nhắn
    function insertEmoji(emoji) {
        const textarea = document.getElementById('message');
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const textAfterCursor = textarea.value.substring(cursorPosition);
        textarea.value = textBeforeCursor + emoji + textAfterCursor;
        textarea.focus();
        textarea.selectionEnd = cursorPosition + emoji.length;
    }

    // Mở hộp thoại chọn tệp khi nhấn vào icon
    $("#openFileInput").on('click', function () {
        $("#fileInput").click();
    });

    // Sự kiện lắng nghe khi người dùng chọn tệp
    $("#fileInput").change(function () {
        const fileName = $(this).val().split('\\').pop(); // Lấy tên tệp từ đường dẫn tệp được chọn
        $('#message').val(fileName); // Hiển thị tên tệp trong ô tin nhắn
    });

    // Xử lý gửi file
    function sendFile(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            console.log("File loaded: ", e.target.result);  // Thêm log để kiểm tra tệp đã đọc
            socket.emit('send', { username: username, message: e.target.result, type: 'file' });
        };
        reader.readAsDataURL(file);
    }

    $(document).ready(function() {
        // Kiểm tra xem thẻ div có id là "content" có rỗng không
        if ($('#content').is(':empty')) {
            // Nếu rỗng, thêm thẻ h2 vào trong div
            $('#content').append('<h4 id="emptyMessage" style="text-align: center; color: #c1a849; margin-top: 150px;">Chào mừng đến với WEB CHAT REAL-TIME <br> hãy bắt đầu những cuộc trò chuyện thú vị cùng nhau nhé!</h4>');
        }
    });

});
