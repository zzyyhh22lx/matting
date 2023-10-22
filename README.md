图像抠图

因为canvas加载图片需要在支持CROS的web服务器运行
> index.html:1 Access to image at 'file:///xxxxxx/matting/h.jpg' from origin 'null' has been blocked by CORS policy: Cross origin requests are only supported for protocol schemes: http, data, isolated-app, chrome-extension, chrome, https, chrome-untrusted.

所以我们使用 http-server 开启一个web服务器

运行
```shell
npm i http-server -S

npm run dev
```
访问 http://127.0.0.1:5000/ 即可

效果如下：

![QQ录屏20231017173503 -original-original](https://github.com/zzyyhh22lx/matting/assets/102452253/8119f2b6-28a2-45c9-a0dc-60b9c06b86e6)


使用：
```js
const canvas = document.getElementById("myCanvas");
const btn = document.getElementById("btn");
const imgSrc = "./h.jpg";
const iCanvas = new SCanvas(canvas, imgSrc);
btn.onclick = () => {
    base64Img.src = iCanvas.getSelectImage();
    // iCanvas.undo(); 撤回上一步操作
    // iCanvas.reset(); 重置图片
    // iCanvas.areas; 查看所有位置点
    // iCanvas.delectArea(n); 删除你框选的第几个区域
}
```
