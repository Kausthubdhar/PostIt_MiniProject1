const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require("path");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser()); 
app.use(express.static(path.join(__dirname,"public")));

app.get("/",(req,res) => {
    res.render('SignUp');
});

app.get('/login', (req, res) => {
    res.render('Login');
});

app.post('/register', async (req,res) => {
    let {name, username, email, age, password} = req.body;

    let user_1 = await userModel.findOne({email});
    let user_2 = await userModel.findOne({username});
    
    if(user_1){
        return res.render('SignUp', {error : "Email Already Exist!"})
    }
    if(user_2){
        return res.render('SignUp', {error : "Username Already Exist!"});
    }

    bcrypt.genSalt(10, (err,salt) => {
        bcrypt.hash(password, salt, async (err,hash)=>{
            let user = await userModel.create({
                name,
                username,
                email,
                age,
                password : hash
            });
            res.render('SignUp', {done : "User Created Successfully! You can Sign in"});
        });
    });
     
});

app.post('/check', async (req,res) => {
    let {email, password} = req.body;
    let user = await userModel.findOne({email});
    if(!user) return res.render('Login', {error : "Email/Password Incorrect, If you are new please Sign Up"});
    bcrypt.compare(password, user.password, (err, result)=>{
        if(result){
            let token = jwt.sign({email, userid : user._id}, "@Key$$phrase$$@");
            res.cookie("token" , token);
            return res.redirect('/home');
        }
        else return res.render('Login', {error : "Email/Password Incorrect, If you are new please Sign Up"});
    });
});

app.get('/logout', (req, res)=>{
    res.cookie("token", "", {expires : new Date(0)});
    res.redirect("/login");
});

app.get('/home', isLoggedIn, async (req,res)=>{
    let user = await userModel.findOne({_id : req.user.userid}).populate('posts');
    console.log(user);
    res.render('profile', {user});
});

app.post('/post',isLoggedIn, async (req,res)=>{
    let {content} = req.body;
    let {userid} = req.user; 
    let user = await userModel.findOne({_id : userid});
    let post = await postModel.create({
        content,
        user : user._id,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/home');
});

app.get('/like/:id',isLoggedIn, async (req, res) =>{
    let post = await postModel.findOne({_id : req.params.id});
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);   
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/home');
});

app.get('/edit/:id', isLoggedIn, async (req, res)=>{
    let post = await postModel.findOne({_id : req.params.id});
    console.log(post);
    res.render('Edit', {post});
});

app.post('/edit/:id', isLoggedIn, async(req, res)=>{
    let content = req.body.content;
    await postModel.findOneAndUpdate({_id : req.params.id}, {content});
    res.redirect(`/edit/${req.params.id}`);
});

function isLoggedIn (req, res, next){
    let token = req.cookies.token;
    if(!token){
        return res.render('Login', {error : "Please Login Before Accessing the website!"});
    }else{
        let data = jwt.verify(token,"@Key$$phrase$$@");
        req.user = data;
    }
    next();
}

app.listen(3000, function(){
    console.log("App Running at Port No:3000");
});