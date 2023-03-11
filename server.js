const express=require('express')
const path=require('path');
const http=require('http')
const socketio=require('socket.io')
const Filter=require('bad-words')
const { generateMessage,generateLocationMessage }=require('./src/utils/message');
const {addUser,removeUser,getUser,getUsersInRoom}=require('./src/utils/users');


const app=express();
const server=http.createServer(app)
const io=socketio(server)
const port=3009;  
const bodyParser=require('body-parser');
const { url } = require('inspector');

app.use(express.static('public'));
app.set("view engine","ejs");
var urlencodedParser=bodyParser.urlencoded({extended:false});
app.set('views',path.join(__dirname,'views'));
app.use(bodyParser.json());

let count=0; 

io.on('connection',(socket)=>{
    console.log('webSocket connection')
    socket.on('join',(options,callback)=>{
       const {error,user}= addUser({id:socket.id,...options})
        if(error){
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message',generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendmesssage',(message,callback)=>{
        const user=getUser(socket.id)
        const filter=new Filter()
        if(filter.isProfane(message)){
            return callback('profanity is not allowed')
        } 
        io.to(user.room).emit('message',generateMessage(user.username,message))
         callback()
    })

    socket.on('sendLocation',(coords,callback)=>{
     const user=getUser(socket.id)
     io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,`http://google.com/maps?q=${coords.latitude},${coords.longitude}`))
     callback()
    })

    socket.on('disconnect',()=>{
        const user=removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left`));
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port,()=>console.log("listening server",port)) ;
