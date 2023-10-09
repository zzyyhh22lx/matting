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

![QQ录屏20231009105141 -original-original](https://github.com/zzyyhh22lx/matting/assets/102452253/87a10b83-ed80-4b78-ac93-ce6121f7b36d)

使用：
```js
const canvas = document.getElementById("myCanvas");
const btn = document.getElementById("btn");
const imgSrc = "./h.jpg";
const iCanvas = new ICanvas(canvas, imgSrc);
btn.onclick = () => {
    base64Img.src = iCanvas.getSelectImage();
    // iCanvas.undo(); 撤回上一步操作
    // iCanvas.reset(); 重置图片
    // iCanvas.areas; 查看所有位置点
    // iCanvas.delectArea(n); 删除你框选的第几个区域
}
```