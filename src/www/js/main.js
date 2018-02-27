let socket = io();
function init(){

    socket.on('message', function (data) {
        $('#text').append(' <pre>' + data + '</pre>');
        $(".console").scrollTop(1E10);
    });

    $('button').on('click', function() {
        socket.emit('action', this.id);
    }).mouseenter(function(){
        $('.description #desc-' + this.id).css('display', 'inline');
    }).mouseleave(function(){
        $('.description #desc-' + this.id).css('display', 'none');
    })

}