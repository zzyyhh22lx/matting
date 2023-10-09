class Point {
    x: number;
    y: number;
    radius: number;
    color: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = 2;
        this.color = "transparent";
    }
}

class Area {
    points: Point[];
    constructor() {
        this.points = [];
    }
    add(point: Point) {
        this.points.push(point);
    }
}

class ICanvas {
    MOVED_FILLSTYLE: string;
    COMMON_FILLSTYLE: string;
    STROKE_STYLE: string;
    LINE_STROKESTYLE: string;
    WIDTH: number;
    HEIGHT: number;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    canvas_clone: HTMLCanvasElement;
    ctx_clone: CanvasRenderingContext2D | null;
    history: ImageData[];
    ctxs: CanvasRenderingContext2D[];
    areas: Area[];
    lineStatus: boolean;
    canDraw: boolean;
    selectAreaIndex: number;
    selectPointIndex: number;
    isMouseDown: boolean;
    isDraw: boolean;
    img: HTMLImageElement;
    downx: number;
    downy: number;

    /**
     * 
     * @param {*} canvas 
     * @param {*} imgSrc 
     * @param {*} width 
     * @param {*} height 
     */
    constructor(canvas: HTMLCanvasElement, imgSrc: string, width = 800, height = 500) {
        this.MOVED_FILLSTYLE = 'rgba(0,0,0,0.8)';
        this.COMMON_FILLSTYLE = 'rgba(0,0,0,0.5)';
        this.STROKE_STYLE = 'black';
        this.LINE_STROKESTYLE = 'red';
        this.WIDTH = width;
        this.HEIGHT = height;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        this.canvas_clone = document.createElement("canvas");
        this.canvas_clone.width = this.WIDTH;
        this.canvas_clone.height = this.HEIGHT;
        this.ctx_clone = this.canvas_clone.getContext("2d", { willReadFrequently: true });

        this.history = [];
        this.ctxs = [];
        this.areas = [];

        this.lineStatus = false;
        this.canDraw = true;
        this.selectAreaIndex = -1;
        this.selectPointIndex = -1;
        this.isMouseDown = false;
        this.isDraw = true;

        this.img = new Image();
        this.img.src = imgSrc;
        this.img.crossOrigin = "anonymous";

        this.img.onload = () => {
            this.drawImg(this.ctx, this.img);
            this.drawImg(this.ctx_clone!, this.img);
            const imageData = this.ctx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
            this.history.push(imageData);
        };

        this.canvas.onmousedown = this.onMouseDown.bind(this);
        this.canvas.onmouseup = this.onMouseUp.bind(this);
        this.canvas.onmousemove = this.onMouseMove.bind(this);

        this.downx = 0;
        this.downy = 0;
    }

    /**
     * 鼠标按下
     * @param {*} e 
     */
    onMouseDown(e: MouseEvent) {
        if (!this.lineStatus) {
            const x = e.pageX - this.canvas.offsetLeft;
            const y = e.pageY - this.canvas.offsetTop;
            this.downx = x;
            this.downy = y;
            this.isMouseDown = true;

            let { pointIndex, areaIndex } = this.findPointIndex(this.ctx, this.areas, x, y); // 先找点，看看用户长按的是不是某个区域的某个点，找到了就不用再找区域了

            if (areaIndex === -1) areaIndex = this.drawAndFindAreaIndex(this.ctx, this.areas, x, y); // 找不到点，再找区域，看看用户是不是长按了某个区域

            if (areaIndex >= 0) {
                this.canDraw = false;
                this.selectAreaIndex = areaIndex;
                this.selectPointIndex = pointIndex;
            } else {
                this.isDraw = true;
                this.clickPoint(e);
            }
        }
    }

    /**
     * 鼠标取消点击
     * @param {*} e 
     */
    onMouseUp(e: MouseEvent) {
        this.isMouseDown = false;
        this.drawAll(this.ctx, this.areas);

        this.isDraw = false;
        this.lineStatus = false;
        this.canDraw = true;
    }

    /**
     * 鼠标移动
     * @param {*} e 
     * @returns 
     */
    onMouseMove(e: MouseEvent) {
        if (this.isMouseDown && this.isDraw) {
            this.clickPoint(e);
        } else {// 移动的时候，计算差值，然后改变区域的位置，重新绘制
            if (!this.isMouseDown || this.lineStatus || this.selectAreaIndex === -1) return;
            const x = e.pageX - this.canvas.offsetLeft;
            const y = e.pageY - this.canvas.offsetTop;
            const disx = x - this.downx;
            const disy = y - this.downy;
            const { points } = this.areas[this.selectAreaIndex];
            if (this.selectPointIndex >= 0) {
                points[this.selectPointIndex].x += disx;
                points[this.selectPointIndex].y += disy;
            } else {
                points.forEach(p => {
                    p.x += disx;
                    p.y += disy;
                })
            }
            this.downx = x;
            this.downy = y;
            this.drawAll(this.ctx, this.areas, this.selectAreaIndex);
        }
    }

    /**
     * 绘画
     * @param {*} e 
     * @returns 
     */
    clickPoint(e: MouseEvent) {
        if (!this.canDraw) return; // 判断用户选中了已画的某个区域，就不再画点了
        let firstPoint = false; // 是不是这个区域的第一个点
        let area = null;
        if (!this.lineStatus) { // 第一个点
            this.lineStatus = true;
            area = new Area();
            firstPoint = true;
        } else if (this.areas.length > 0) {
            area = this.areas[this.areas.length - 1];
        }
        const x = e.pageX - this.canvas.offsetLeft;
        const y = e.pageY - this.canvas.offsetTop;
        const index = this.clickPointIndex(x, y, area!); //判断当前点击的位置在不在已画的某个点上
        const p = new Point(x, y);
        area!.add(p); // 判断是继续画点的

        // 先画之前所有的区域，在画本次未完成的点线
        this.drawAll(this.ctx, this.areas.filter((i, j) => (j < this.areas.length - 1 || firstPoint)));
        this.drawPoint(this.ctx, area!);
        this.ctx.beginPath();
        this.drawLine(this.ctx, area!);

        if(index === -1) { // 新区域首个点，保存数据到数组中
            if (firstPoint) this.areas.push(area!);
        }

        // lineStatus = false;
        this.ctx.closePath();
        this.ctx.fillStyle = this.COMMON_FILLSTYLE;
        this.ctx.fill();

        this.ctx.restore();

        const imageData = this.ctx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        this.history.push(imageData);
    }

    /**
     * 画背景图图
     * @param {*} ctx 
     * @param {*} img 
     */
    drawImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
        ctx.drawImage(img, 0, 0, this.WIDTH, this.HEIGHT);
    }

    /**
     * 画当前区域所有的点
     * @param {*} ctx 
     * @param {*} area 
     */
    drawPoint(ctx: CanvasRenderingContext2D, area: Area) {
        const { points } = area;
        ctx.save();
        points.forEach(p => {
            ctx.moveTo(p.x, p.y);
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            ctx.closePath();
            ctx.fillStyle = p.color;
            ctx.strokeStyle = this.STROKE_STYLE;
            ctx.fill();
        })
        ctx.restore();
    }

    /**
     * 画当前区域的所有的线
     * @param {*} ctx 
     * @param {*} area 
     */
    drawLine(ctx: CanvasRenderingContext2D, area: Area) {
        const { points } = area;
        points.forEach((p,i) => {
            if (i === 0) {
                ctx.moveTo(p.x, p.y)
            } else {
                ctx.lineTo(p.x, p.y)
            }
        })
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.LINE_STROKESTYLE;
        ctx.stroke();
    }

    /**
     * 计算当前坐标是不是在当前区域的路径点上，并返回下标
     * @param {*} x 
     * @param {*} y 
     * @param {*} area 
     * @returns 
     */
    clickPointIndex(x: number, y: number, area: Area) {
        const { points } = area;
        for(let i = 0; i < points.length; i++) {
            const p = points[i];
            //使用勾股定理计算这个点与圆心之间的距离
            const distanceFromCenter = Math.sqrt(Math.pow(p.x - x, 2)
                + Math.pow(p.y - y, 2));
            if (distanceFromCenter <= p.radius) {
                //停止搜索
                return i;
            }
        }
        return -1;
    }

    /**
     * 清空画布，画背景图，画所有区域
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} selectAreaIndex 选择的区域
     */
    drawAll(ctx: CanvasRenderingContext2D, areas: Area[], selectAreaIndex = -1) {
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.drawImg(ctx, this.img);
        areas.forEach((area, i) => {
            this.drawPoint(ctx, area);
            ctx.beginPath();
            this.drawLine(ctx, area);
            ctx.closePath();
            // 设置选中拖动时fill颜色
            if (i === selectAreaIndex) {
                ctx.fillStyle = this.MOVED_FILLSTYLE;
            } else {
                ctx.fillStyle = this.COMMON_FILLSTYLE
            }
            ctx.fill();
        })
    }

    /**
     * 画所有区域，并且找到当前坐标在哪个区域上，并返回下标
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} x 
     * @param {*} y 
     * @returns 
     */
    drawAndFindAreaIndex(ctx: CanvasRenderingContext2D, areas: Area[], x: number, y: number) {
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.drawImg(ctx, this.img);
        let index = -1;
        areas.forEach((area, i) => {
            this.drawPoint(ctx, area);
            ctx.beginPath();
            this.drawLine(ctx, area);
            ctx.closePath();
            const inPath = ctx.isPointInPath(x, y);
            if (inPath) index = i;
            ctx.fillStyle = this.COMMON_FILLSTYLE;
            ctx.fill();
        })
        return index;
    }

    /**
     * 找到当前坐标在哪个区域的哪个坐标点上，并将两个下标返回
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} x 
     * @param {*} y 
     * @returns 
     */
    findPointIndex(ctx: CanvasRenderingContext2D, areas: Area[], x: number, y: number) {
        let areaIndex = -1;
        let pointIndex = -1;
        areas.forEach((area, i) => {
            if (areaIndex >= 0) return;
            const index = this.clickPointIndex(x, y, area);
            if (index >= 0) {
                areaIndex = i;
                pointIndex = index;
            }
        })
        return {
            areaIndex,
            pointIndex
        }
    }

    /**
     * 撤销上一步操作
     */
    undo() {
        // 思路是保存每一次操作于history数组中，栈弹出
        if (this.history.length > 1) {
            // 从历史记录数组中删除最后一项
            this.history.pop();

            // 恢复倒数第二项的图像数据到 canvas 上
            const imageData = this.history[this.history.length - 1];
            this.ctx.putImageData(imageData, 0, 0);

            const A = this.areas[this.areas.length - 1];
            if(!this.lineStatus) {
                A.points.pop();
                this.lineStatus = true;
            } else {
                A.points.pop();
            } 
        }
    }

    /**
     * 获取选中的base64图片
     * @returns base64
     */
    getSelectImage() {
        // ctxs保存所有闭合区域
        const ctxs: CanvasRenderingContext2D[] = [];
        this.areas.forEach(area => {
            const my_canvas_clone = document.createElement("canvas");
            my_canvas_clone.width = this.WIDTH;
            my_canvas_clone.height = this.HEIGHT;
            const my_ctx_clone = my_canvas_clone.getContext("2d");
            // 克隆一个新的canvas(后续保存图片)
            this.drawAll(my_ctx_clone!, [area]);
            ctxs.push(my_ctx_clone!);
        });
        
        let minX = 0, minY = 0, maxX = this.WIDTH, maxY = this.HEIGHT;

        // 获取矩形区域内的图像数据
        let imageData = this.ctx_clone!.getImageData(minX, minY, maxX - minX, maxY - minY);

        // 检查新 canvas 上的每个像素是否位于原始路径内，如果不是，则将该像素设置为透明
        for (let y = 0; y < this.canvas_clone.height; y++) {
            for (let x = 0; x < this.canvas_clone.width; x++) {
                if (ctxs.every(ctx => !ctx.isPointInPath(x + minX, y + minY))) {
                    let index = (y * this.canvas_clone.width + x) * 4;
                    imageData.data[index + 3] = 0; // 设置 alpha 通道为 0（透明）
                }
            }
        }
        // 将修改后的图像数据重新绘制到新 canvas 上
        this.ctx_clone!.putImageData(imageData, 0, 0);

        // 将新 canvas 转换为 Data URL
        const base64Img = this.canvas_clone.toDataURL();
        // 重置
        this.drawAll(this.ctx_clone!, []);
        // 释放
        ctxs.length = 0;

        return base64Img;
    }

    /**
     * 删除第几个区域
     * @param {*} value number 
     * @returns 
     */
    delectArea(value: number) {
        const n = Number(value);
        if (Number.isNaN(n)) {
            console.log('请输入数字');
            return;
        }
        if (this.areas.length < n) {
            console.log('区域不存在');
            return;
        }
        this.areas.splice(n - 1, 1);
        this.drawAll(this.ctx, this.areas);
    }

    /**
     * 重置
     */
    reset() {
        this.drawAll(this.ctx, []);
        this.areas.length = 0;
    }
}
