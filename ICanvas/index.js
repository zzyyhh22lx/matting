class historyCache {
    /**
     * history缓存(默认最多缓存15条撤销记录) 超过的将最开始的去掉
     * @param {*} n 
     */
    constructor(n = 15) {
        this.size = n;
        this.cacheMap = []; // :area[]
        this.cache = []; // 缓存删除的记录，如果不小心删除可以加回来
    }
    length() {
        return this.cacheMap.length;
    }
    push(area) {
        if(this.cacheMap.length >= this.size) {
            this.cacheMap.shift();
        }
        this.cacheMap.push(area);
    }
    get() { // 得到最后一项
        return this.cacheMap[this.length() - 1];
    }
    pop() {
        if(this.cache.length >= this.size) {
            this.cache.shift();
        }
        const area = this.cacheMap.pop();
        this.cache.push(area);
        return area;
    }
}

/**
 * 防抖节流
 * @param {*} fn 
 * @param {*} delay 
 * @param {*} immediate 
 * @returns 
 */
function debounce(fn, delay, immediate = false) { // 默认防抖
    let timer;
    if(immediate) { // 立即执行，节流，n秒执行一次
        return function(...args) {
            if(timer) return timer;
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        }
    } else { // 非立即执行，防抖，n秒内重复点击只执行最后一次
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        }
    }
}

/**
 * 深拷贝
 * @param {*} obj 
 * @returns 
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 根据两个点生成俩个位于俩点中间的点
 * @param {*} x1 点1
 * @param {*} x2 点2
 * @returns {x, y}
 */
function getRandomXY(x1, x2) {
    const rx = (x1.x + x2.x) / 2;
    const ry = (x1.y + x2.y) / 2;
    return {
        rx, ry
    }
}

/**
 * 射线法，判断点是否处于polygon的区域内
 * 基本思路是从点向任意方向发射一条射线，然后计算射线与多边形边界的交点数量。如果交点数量为奇数，那么点在多边形内；如果交点数量为偶数，那么点在多边形外。
 * @param {*} point {x, y}
 * @param {*} polygon points[]
 * @returns 
 */
function isPointInPolygon(point, polygon) {
    const x = point.x;
    const y = point.y;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * 判断点是否在贝塞尔曲线形成闭合曲线内 - isPointInsideBezierCurve({ x: 100, y: 100 }, p0, p1, p2, p3);
 * @param {*} p0 
 * @param {*} p1 
 * @param {*} p2 
 * @param {*} p3 
 * @param {*} t 
 * @returns 
 */
function pointOnBezierCurve(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    };
}

/**
 * 讲贝塞尔曲线点变成多边形计算
 * @param {*} points 
 * @param {*} samples 
 * @returns 
 */
function bezierCurveToPolygon(points, samples = 100) {
    const polygon = [];

    for (let i = 0; i < points.length - 3; i += 3) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];
        const p3 = points[i + 3];

        for (let j = 0; j <= samples; j++) {
            const t = j / samples;
            const point = pointOnBezierCurve(p0, p1, p2, p3, t);
            polygon.push(point);
        }
    }
    return polygon;
}

class Point {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = options.radius || 5;
        this.color = options.color || 'black';
        this.shape = options.shape || 'circle';
    }
    setRadius(radius = 2) {
        this.radius = radius;
    }
    setColor(color = "transparent") {
        this.color = color;
    }
}

class Area {
    /**
     * area 
     * @param {*} isbezier 是否是贝塞尔曲线的点
     */
    constructor(isbezier = false) {
        this.points = [];
        this.isbezier = isbezier;
    }
    add(...point) {
        this.points.push(...point);
    }
}

class SCanvas {
    /**
     * 
     * @param {*} doms Obj{canvas, imgSrc, contextMenu} 
     * @param {*} size Obj{width, height} 
     */
    constructor(doms, size = {width: 800, height: 500}, minimap_size = {width: 160, height: 100} ) {
        const { canvas, imgSrc, minimap } = doms;
        const { width, height } = size;
        this.MOVED_FILLSTYLE = 'rgba(0,0,0,0.8)';
        this.COMMON_FILLSTYLE = 'rgba(25,25,25,0.5)';
        this.STROKE_STYLE = 'rgba(25,25,25,0.5)';
        this.BASESHAPE = 'circle'; // 基础点的形状(也用来区分辅助点)
        /** 连线颜色 */
        this.LINE_STROKESTYLE = 'green';
        /** 基点bg颜色 */
        this.BASE_COLOR = 'red';
        /** 辅助线颜色 */
        this.AUX_STROKESTYLE = 'rgba(0,0,0,0.5)';
        /** 辅助点颜色 */
        this.AUX_COLOR = 'blue';

        this.WIDTH = width;
        this.HEIGHT = height;

        this.MINIWIDTH = minimap_size.width;
        this.MINIHEIGHT = minimap_size.height;

        // 单点
        this.PRADIUS = 5;
        this.PCOLOR = 'black'
        // 长按
        this.UPRADIUS = 2;
        this.UPCOLOR = 'transparent';

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", { willReadFrequently: true });

        /**小地图*/
        this.minimap = null;
        this.minimap_ctx = null;
        /** 缩放倍数 */
        this.scale = 1;
        /** 滚轮一次移动缩放倍数 */
        this.scaleStep = 0.1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDraggingMinimap = false;
        this.dragStartX;
        this.dragStartY;

        this.watchMiniMap_D_Event = (e) => {
            this.isDraggingMinimap = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
        }
        this.watchMiniMap_M_Event = (e) => {
            if (this.isDraggingMinimap) {
                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;

                const newOffsetX = this.offsetX - deltaX * (this.WIDTH / this.MINIWIDTH) * this.scale;
                const newOffsetY = this.offsetY - deltaY * (this.HEIGHT / this.MINIHEIGHT) * this.scale;

                const minOffsetX = (-this.canvas.width * (1 - this.MINIWIDTH / this.WIDTH) * this.scale / 2);
                const minOffsetY = -this.canvas.height * (1 - this.MINIHEIGHT / this.HEIGHT) * this.scale / 2;
                const maxOffsetX = 0;
                const maxOffsetY = 0;
                // 限制偏移量在允许的范围内
                this.offsetX = Math.min(Math.max(newOffsetX, minOffsetX), maxOffsetX);
                this.offsetY = Math.min(Math.max(newOffsetY, minOffsetY), maxOffsetY);

                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY; 
                this.drawAll();
                this.drawMiniMap();
            }
        }
        this.watchMiniMap_U_Event = () => {
            this.isDraggingMinimap = false;
        }
        if (minimap) {
            this.minimap = minimap;
            this.minimap_ctx = minimap.getContext("2d");
            this.minimap.addEventListener("mousedown", this.watchMiniMap_D_Event.bind(this));
            this.minimap.addEventListener("mousemove", this.watchMiniMap_M_Event.bind(this));
            this.minimap.addEventListener("mouseup", this.watchMiniMap_U_Event.bind(this));
        }

        this.scaleMap = (e) => {
            e.preventDefault();
            // 根据滚轮方向调整缩放级别
            this.scale += (e.deltaY < 0 ? 1 : -1) * this.scaleStep;

            this.scale = Math.max(this.scale, 1); // 不能缩小，只能放大
            
            // 重新绘制内容和小地图
            this.drawAll();
            
            this.drawMiniMap();
        }

        this.canvas.addEventListener('wheel', this.scaleMap.bind(this));

        this.canvas_clone = document.createElement("canvas");
        this.canvas_clone.width = this.WIDTH;
        this.canvas_clone.height = this.HEIGHT;
        this.ctx_clone = this.canvas_clone.getContext("2d", { willReadFrequently: true });

        this.history = new historyCache(15);
        /** 所有点位置信息 area[] */
        this.areas = [];
        /** 贝塞尔曲线path路径 判断点击的点是否在贝塞尔曲线内 Path2D[][] */
        // this.bezierPaths = []; 不用了，计算path2d位置有bug

        /**
         * 移动的时候添加history(加一个防抖)
         */
        this.addHistory = debounce(() => {
            this.history.push(deepClone(this.areas));
        }, 200);

        // 保存所有图层
        this.images = [];

        this.lineStatus = false;
        this.canDraw = true;
        this.selectAreaIndex = -1;
        this.selectPointIndex = -1;
        this.isMouseDown = false;
        this.isDraw = true;

        /** 贝塞尔曲线点计数(4,3,3,3..) */
        this.pointCounter = 0;
        /** 贝塞尔曲线是否闭合 */
        this.isFill = true;

        this.img = new Image();
        this.img.src = imgSrc;
        this.img.crossOrigin = "anonymous";

        this.img.onload = () => {
            this.drawImg(this.ctx, this.img);
            this.drawImg(this.ctx_clone, this.img);
            const imageData = this.ctx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
            this.images.push(imageData);
        };

        // 单点
        this.onSLD_Event = this.onSingleMouseDown.bind(this);
        this.onSLM_Event = this.onSingleMouseMove.bind(this);
        this.onSLU_Event = this.onSingleMouseUp.bind(this);
        // 单点绘画贝塞尔曲线
        this.onDBD_Event = this.onSingleDBMouseDown.bind(this);
        this.onDBM_Event = this.onSingleDBMouseMove.bind(this);
        this.onDBU_Event = this.onSingleDBMouseUp.bind(this);
        // 长按移动贝塞尔曲线区域
        this.onDBM_Area_Event = this.onSingleDBAMouseMove.bind(this);
        // 框选图层(长按)
        this.onMD_Event = this.onMouseDown.bind(this);;
        this.onMV_Event = this.onMouseMove.bind(this);
        this.onMU_Event = this.onMouseUp.bind(this);
        // 点击图层
        this.onMDC_Event = this.selectImage.bind(this);

        // 默认单点事件
        this.single_Event();

        this.canvas.addEventListener('contextmenu', this.findAllIndex.bind(this))
    }

    /**
     * 获取dom离页面左边上边的距离
     * @param {*} element dom元素
     * @returns 
     */
    getElementDistance(element) {
        const rect = element.getBoundingClientRect();
        const leftDistance = rect.left + window.pageXOffset;
        const topDistance = rect.top + window.pageYOffset;
        return {
            leftDistance, topDistance
        }
    }
    
    /**
     * 获取x，y位置
     * @param {*} e 
     * @param {*} element 
     * @returns 
     */
    getXY(e, element) {
        const {
            leftDistance, topDistance
        } = this.getElementDistance(element);
        const x = ((e.pageX - leftDistance )/ this.scale);
        const y = ((e.pageY - topDistance) / this.scale);
        console.log(this.scale, this.offsetX);
        return {
            x, y
        }
    }

    /**
     * 绘制小地图
     * @param {*} ctx 
     * @param {*} areas 
     * @returns 
     */
    drawMiniMap(ctx = this.minimap_ctx, areas = this.areas, canvas = this.minimap) {
        if (!this.minimap) return;
        const _this = this;
        this.drawAll(ctx, areas.map(item => {
            // 缩放点
            const updatedPoints = item.points.map(point => {
              return {
                ...point,
                radius: point.radius / (_this.WIDTH/_this.MINIWIDTH),
                x: point.x / (_this.WIDTH/_this.MINIWIDTH),
                y: point.y / (_this.HEIGHT/_this.MINIHEIGHT)
              };
            });
          
            return {
              ...item,
              points: updatedPoints
            };
        }), canvas);
        // 绘制小框
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.offsetX * (this.MINIWIDTH / this.WIDTH) / this.scale, -this.offsetY * (this.MINIHEIGHT / this.HEIGHT) / this.scale, this.MINIWIDTH / this.scale, this.MINIHEIGHT / this.scale);
    }

    /**
     * 判断点击的点是否在框选区域上, 如果有则设置(鼠标右键)
     * this.selectAreaIndex
     * this.selectPointIndex
     * @param {*} e 
     * @return {pointIndex, areaIndex}
     */
    findAllIndex(e) {
        const {
            x, y
        } = this.getXY(e, this.canvas); 
        let { pointIndex, areaIndex } = this.findPointIndex(this.ctx, this.areas, x, y); // 先找点，看看用户长按的是不是某个区域的某个点，找到了就不用再找区域了
        if (areaIndex === -1) areaIndex = this.drawAndFindAreaIndex(this.ctx, this.areas, x, y); //找不到点，再找区域，看看用户是不是长按了某个区域
        
        if (areaIndex >= 0) {
            this.selectAreaIndex = areaIndex;
            this.selectPointIndex = pointIndex;
        };
        return {
            pointIndex, areaIndex
        }
    }

    /**
     * 单点事件(不长按) 
     * @param {*} isDrawbezier 是否绘画贝塞尔曲线true 默认false
     * 绘画贝塞尔曲线按4，3，3，3来绘画，即俩个点作为辅助点
     */
    single_Event(isDrawbezier = false) {
        this.removeAll_Event();
        this.canvas.addEventListener('mousedown', isDrawbezier ? this.onDBD_Event : this.onSLD_Event);
        this.canvas.addEventListener('mousemove', this.onSLM_Event);
        this.canvas.addEventListener('mouseup', this.onSLU_Event);
    }

    /**
     * 可框选事件(长按)
     */
    setSelect_Event() {
        this.removeAll_Event();
        this.canvas.addEventListener('mousedown', this.onMD_Event);
        this.canvas.addEventListener('mouseup', this.onMU_Event);
        this.canvas.addEventListener('mousemove', this.onMV_Event);
    }

    /**
     * 点击图层事件(高亮)
     */
    setDownCanvas_Event() {
        this.removeAll_Event();
        this.canvas.addEventListener('mousedown', this.onMDC_Event);
    }

    /**
     * 移除所有监听器
     */
    removeAll_Event() {
        this.canvas.removeEventListener('mousedown', this.onMD_Event);
        this.canvas.removeEventListener('mouseup', this.onMU_Event);
        this.canvas.removeEventListener('mousemove', this.onMM_Event);
        this.canvas.removeEventListener('mousedown', this.onDBD_Event);
        this.canvas.removeEventListener('mouseup', this.onDBU_Event);
        this.canvas.removeEventListener('mousemove', this.onDBM_Event);
        this.canvas.removeEventListener('mousedown', this.onMDC_Event);
        this.canvas.removeEventListener('mousedown', this.onSLD_Event);
        this.canvas.removeEventListener('mousemove', this.onSLM_Event);
        this.canvas.removeEventListener('mouseup', this.onSLU_Event);
    }

    /**
     * 绘画贝塞尔曲线函数
     * @param {*} e 
     */
    onSingleDBMouseDown(e) {
        if (e.button !== 0) return;
        const _this = this;
        const {
            x, y
        } = this.getXY(e, this.canvas);
        this.downx = x;
        this.downy = y;
        let { pointIndex, areaIndex } = this.findAllIndex(e);
        if (areaIndex >= 0) { // 找到点或区域(拖动)
            if (pointIndex >= 0) { // 触发点移动
                this.canvas.addEventListener('mousemove', this.onDBM_Event);
            } else {
                this.canvas.addEventListener('mousemove', this.onDBM_Area_Event);
            }
            this.canvas.addEventListener('mouseup', this.onDBU_Event);
        } else { // 画点
            let area = null;
            if(this.isFill) {
                this.isFill = false;
                area = new Area(true);
                this.areas.push(area);
            } else {
                area = this.areas[this.areas.length - 1];
            }
            if (this.pointCounter < 2) {
                const pointOptions = {
                    radius: 5,
                    color: _this.BASE_COLOR,
                    shape: this.BASESHAPE
                };
                const point = new Point(x, y, pointOptions);
                area.add(point);

                this.pointCounter++;
                const P = area.points;
                if (this.pointCounter === 2 || P.length > 1) {
                    // 自动补充辅助点
                    const [point1, point4] = P.splice(-2);
                    const { rx, ry } = getRandomXY(point1, point4);
                    /** 辅助点2 */
                    const point2 = new Point(rx, ry, {
                        radius: 5,
                        color: this.AUX_COLOR,
                        shape: 'square'
                    });
                    /** 辅助点3 */
                    const point3 = new Point(rx, ry, {
                        radius: 5,
                        color: this.AUX_COLOR,
                        shape: 'square'
                    });
                    area.add(point1,point2,point3,point4);
                    this.pointCounter = 0;
                }
                this.drawAll(this.ctx, this.areas);
                
                this.history.push(deepClone(this.areas));
            }
        }
    }

    /**
     * 
     * @param {*} e 
     */
    onSingleDBMouseMove(e) {
        const {
            x, y
        } = this.getXY(e, this.canvas);
        const point = this.areas[this.selectAreaIndex].points[this.selectPointIndex]
        point.x = x;
        point.y = y;
        this.drawAll(this.ctx, this.areas);
        this.addHistory();
    }

    /**
     * 长按移动贝塞尔区域
     * @param {*} e 
     */
    onSingleDBAMouseMove(e) {
        if (e.button !== 0) return;
        const {
            x, y
        } = this.getXY(e, this.canvas);
        const disx = x - this.downx;
        const disy = y - this.downy;
        const {points} = this.areas[this.selectAreaIndex];
        points.forEach(p => {
            p.x += disx;
            p.y += disy;
        });
        this.downx = x;
        this.downy = y;
        this.drawAll(this.ctx, this.areas);
        this.addHistory();
    }

    /**
     * 
     * @param {*} e 
     */
    onSingleDBMouseUp(e) {
        this.canvas.removeEventListener('mousemove', this.onDBM_Event);
        this.canvas.removeEventListener('mousemove', this.onDBM_Area_Event);
        this.canvas.removeEventListener('mouseup', this.onDBU_Event);
    }

    /**
     * 绘制贝塞尔曲线及辅助线
     * @param {*} ctx 
     * @param {*} points 
     * @param {*} index 默认-1 贝塞尔曲线传(用来添加路径)
     */
    drwaBezierLine(ctx, points) {
        for (let i = 0; i + 3 < points.length; i += 3) {
            const startPoint = points[i];
            const controlPoint1 = points[i + 1];
            const controlPoint2 = points[i + 2];
            const endPoint = points[i + 3];
            // Draw bezier curve
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.bezierCurveTo(controlPoint1.x, controlPoint1.y, controlPoint2.x, controlPoint2.y, endPoint.x, endPoint.y);

            ctx.strokeStyle = this.LINE_STROKESTYLE;
            ctx.stroke();
            // Draw control lines
            this.drawControlLine(ctx, startPoint, controlPoint1);
            this.drawControlLine(ctx, endPoint, controlPoint2);
        }
    }

    /**
     * 绘制辅助线直线
     * @param {*} ctx 
     * @param {*} startPoint 
     * @param {*} controlPoint 
     */
    drawControlLine(ctx, startPoint, controlPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(controlPoint.x, controlPoint.y);
        ctx.strokeStyle = this.AUX_STROKESTYLE;
        ctx.stroke();
    }

    /**
     * 绘制所有线：贝塞尔曲线+线段框选区域
     * @param {*} ctx 
     * @param {*} areas 
     */
    drawAll(ctx = this.ctx, areas = this.areas, canvas = this.canvas) {
        // 重置缩放矩阵
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // 缩放
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        this.drawImg(ctx, this.img, canvas);
        // 贝塞尔曲线的点和直接单点连线是不一样的
        const bezierIndexs = this.drawFillLine(ctx, areas);

        bezierIndexs.forEach(bzIndex => {
            const points = areas[bzIndex].points;
            ctx.beginPath();
            this.drwaBezierLine(ctx, points);
            // closePath将当前子路径的起始点和结束点连接
            ctx.closePath();
            
            // 闭合曲线 填充颜色
            if (points.length > 2) {
                // 第一个点和最后一个点不能是同个点  
                const firstPoint = points[0];
                const lastNonControlPoint = points[points.length - 1];
                const dx = firstPoint.x - lastNonControlPoint.x;
                const dy = firstPoint.y - lastNonControlPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if(distance <= firstPoint.radius) { // 数组的第一个点和最后一个点近似重合
                    this.fillBezier(ctx, points);
                    // 如果是最后一个数组才触发(否则会出现前面有闭合曲线，后面全都是新建点的问题)
                    if (bzIndex === bezierIndexs[bezierIndexs.length - 1]) this.isFill = true;
                }
            }
            // Draw points
            this.drawPoint(this.ctx, areas[bzIndex]);
        })
    }


    /**
     * 绘制闭合的贝塞尔曲线
     * @param {*} ctx 
     * @param {*} points 
     */
    fillBezier(ctx, points) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i + 3 < points.length; i += 3) {
            const startPoint = points[i];
            const controlPoint1 = points[i + 1];
            const controlPoint2 = points[i + 2];
            const endPoint = points[i + 3];
            ctx.bezierCurveTo(controlPoint1.x, controlPoint1.y, controlPoint2.x, controlPoint2.y, endPoint.x, endPoint.y);
        }
        ctx.fillStyle = this.STROKE_STYLE;
        ctx.fill();
        ctx.stroke();
    }

    /**
     * 单点的鼠标按下
     * @param {*} e 
     */
    onSingleMouseDown(e) {
        // 只有鼠标左键点击才触发
        if (e.button !== 0) return;
        const {
            x, y
        } = this.getXY(e, this.canvas);
        this.downx = x;
        this.downy = y;
        this.isMouseDown = true;
        if (!this.lineStatus) { // 这个状态表示，目前是所有区域都闭合的状态，此时在某个区域长按，可以移动该区域。长按某个区域的路径点，可以伸缩变化改点和区域的位置
            let { pointIndex, areaIndex } = this.findAllIndex(e);
            if (areaIndex >= 0) {
                this.canDraw = false;
            } else { //没找到，证明用户是想新建区域画点。
                this.canDraw = true;
            }
        }

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
        const index = this.clickPointIndex(x, y, area); //判断当前点击的位置在不在已画的某个点上
        const p = new Point(x, y);
        p.setColor(this.BASE_COLOR);
        p.setRadius(this.PRADIUS);
        area.add(p); // 判断是继续画点的

        // 先画之前所有的区域，在画本次未完成的点线
        this.drawAll(this.ctx, this.areas.filter((i, j) => (j < this.areas.length - 1 || firstPoint)));
        this.drawPoint(this.ctx, area);
        this.ctx.beginPath();
        this.drawLine(this.ctx, area);

        //判断这次画的点是不是这个区域的第一个点，如果是，这个区域就闭合了
        if (index === 0) {
            this.lineStatus = false;
            this.ctx.closePath();
            this.ctx.fillStyle = this.COMMON_FILLSTYLE;
            this.ctx.fill();
            this.ctx.restore();

        } else if(index === -1) { // 新区域首个点，保存数据到数组中
            if (firstPoint) this.areas.push(area);
        }

        this.history.push(deepClone(this.areas));
    }

    /**
     * 单点鼠标移动事件
     * @param {*} e 
     */
    onSingleMouseMove(e) {
        if (!this.isMouseDown || this.lineStatus || this.selectAreaIndex === -1) return;
        const {
            x, y
        } = this.getXY(e, this.canvas);
        const disx = x - this.downx;
        const disy = y - this.downy;
        const {points} = this.areas[this.selectAreaIndex];
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
        this.drawAll(this.ctx, this.areas);
        this.addHistory();
    }

    /**
     * 单点鼠标
     * @param {*} e 
     */
    onSingleMouseUp(e) {
        this.isMouseDown = false;
        this.selectAreaIndex = -1;
        this.selectPointIndex = -1;
    }

    /**
     * 鼠标按下(长按)
     * @param {*} e 
     */
    onMouseDown(e) {
        if (!this.lineStatus) {
            const {
                x, y
            } = this.getXY(e, this.canvas);
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
    onMouseUp(e) {
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
    onMouseMove(e) {
        if (this.isMouseDown && this.isDraw) {
            this.clickPoint(e);
        } else {// 移动的时候，计算差值，然后改变区域的位置，重新绘制
            if (!this.isMouseDown || this.lineStatus || this.selectAreaIndex === -1) return;
            const {
                x, y
            } = this.getXY(e, this.canvas);
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
     * 绘画(长按)
     * @param {*} e 
     * @returns 
     */
    clickPoint(e) {
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
        const {
            x, y
        } = this.getXY(e, this.canvas);
        const index = this.clickPointIndex(x, y, area); //判断当前点击的位置在不在已画的某个点上
        const p = new Point(x, y);
        p.setColor(this.UPRADIUS);
        p.setRadius(this.UPRADIUS);
        area.add(p); // 判断是继续画点的

        // 先画之前所有的区域，在画本次未完成的点线
        this.drawAll(this.ctx, this.areas.filter((i, j) => (j < this.areas.length - 1 || firstPoint)));
        this.drawPoint(this.ctx, area);
        this.ctx.beginPath();
        this.drawLine(this.ctx, area);

        if(index === -1) { // 新区域首个点，保存数据到数组中
            if (firstPoint) this.areas.push(area);
        }

        // lineStatus = false;
        this.ctx.closePath();
        this.ctx.fillStyle = this.COMMON_FILLSTYLE;
        this.ctx.fill();

        this.ctx.restore();

        this.history.push(deepClone(this.areas));
    }

    /**
     * 画背景图图
     * @param {*} ctx 
     * @param {*} img 
     * @param canvas
     */
    drawImg(ctx, img, canvas = this.canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    /**
     * 画当前区域所有的点
     * @param {*} ctx 
     * @param {*} area 
     */
    drawPoint(ctx, area) {
        const { points } = area;
        points.forEach(point => {
            ctx.moveTo(point.x, point.y);
            ctx.fillStyle = point.color;
            if (point.shape === this.BASESHAPE) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (point.shape === 'square') { // 辅助点
                ctx.fillRect(point.x - point.radius, point.y - point.radius, point.radius * 2, point.radius * 2);
            }
            ctx.closePath();
        })
    }

    /**
     * 画当前区域的所有的线
     * @param {*} ctx 
     * @param {*} area 
     */
    drawLine(ctx, area, index = -1, lineColor = this.LINE_STROKESTYLE) {
        const { points } = area;
        if (area.isbezier) {
            this.drwaBezierLine(ctx, points, index);
        } else {     
            points.forEach((p,i) => {
                if (i === 0) {
                    ctx.moveTo(p.x, p.y)
                } else {
                    ctx.lineTo(p.x, p.y)
                }
            })
            ctx.lineWidth = 1;
            ctx.strokeStyle = lineColor;
            ctx.stroke();
        }
    }

    /**
     * 计算当前坐标是不是在当前区域的路径点上，并返回下标
     * @param {*} x 
     * @param {*} y 
     * @param {*} area 
     * @returns 
     */
    clickPointIndex(x, y, area) {
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
     * 清空画布，画背景图，画所有区域 并返回带贝塞尔曲线的点[x, x, x](贝塞尔绘画方式不一样)
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} selectAreaIndex 选择的区域
     * @return 返回带贝塞尔曲线的areas下标[x, x, x]
     */
    drawFillLine(ctx, areas, selectAreaIndex = -1) {
        const bezierIndexs = [];
        for(let i = 0; i < areas.length; i++) {
            const area = areas[i];
            if(area.isbezier) {
                bezierIndexs.push(i);
                continue;
            }
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
        }
        return bezierIndexs;
    }

    /**
     * 画所有区域，并且找到当前坐标在哪个区域上，并返回下标
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} x 
     * @param {*} y 
     * @returns 
     */
    drawAndFindAreaIndex(ctx, areas, x, y) {
        this.drawImg(ctx, this.img);
        let index = -1;
        let bi = 0;
        areas.forEach((area, i) => {
            this.drawPoint(ctx, area);
            ctx.beginPath();
            if (area.isbezier) {
                // 对于贝塞尔曲线 需要索引 保存曲线路径
                this.drawLine(ctx, area, bi++);
            } else {
                this.drawLine(ctx, area);
            }
            ctx.closePath();
            // ctx.isPointInPath检查指定的点是否在当前路径中
            let inPath = null;
            // 因为贝塞尔曲线和其他直线的绘画闭合是不一样的
            if (area.isbezier) {
                inPath = this.isBzPointInPath(x, y, area.points);
                this.fillBezier(ctx, area.points);
            } else {
                inPath = ctx.isPointInPath(x, y);
                ctx.fillStyle = this.COMMON_FILLSTYLE;
                ctx.fill();
            }
            if (inPath) index = i;
        })
        return index;
    }

    /**
     * 返回是否点在贝塞尔曲线
     * 对于贝塞尔曲线的判定：先判断曲线区域，然后再判断点相连的位置，也就是多边形区域(有bug)
     * 修复：沿贝塞尔曲线采样一些点并连接它们以形成多边形(精度取决于sample大小)
     * @param {*} ctx 
     * @param {*} bzs Path2D[]
     * @param {*} x 
     * @param {*} y 
     * @param {*} points
     */
    isBzPointInPath(x, y, points) {
        const polygon = bezierCurveToPolygon(points);
        return isPointInPolygon({ x, y }, polygon);
    }

    /**
     * 判断点是否为于这些选中区域内
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} x 
     * @param {*} y 
     * @returns 
     */
    isAllBzPointInPath(ctx, areas, x, y) {
        let inPath = false;
        for (const area of areas) {
            if (area.isbezier) {
                inPath = this.isBzPointInPath(x, y, area.points);
            } else {
                inPath = isPointInPolygon({x, y}, area.points);
            }
            if (inPath) return true;
        }
        return false;
    }

    /**
     * 找到当前坐标在哪个区域的哪个坐标点上，并将两个下标返回
     * @param {*} ctx 
     * @param {*} areas 
     * @param {*} x 
     * @param {*} y 
     * @returns 
     */
    findPointIndex(ctx, areas, x, y) {
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
        // 思路是保存每一次点于history数组中，栈弹出
        if (this.history.length() > 1) {
            this.history.pop();
            this.areas = this.history.get();
            this.drawAll(this.ctx, this.areas);
        }
    }

    /**
     * 获取选中的base64图片
     * @returns base64
     */
    getSelectImage() {
        let minX = 0, minY = 0, maxX = this.WIDTH, maxY = this.HEIGHT;

        // 获取矩形区域内的图像数据
        let imageData = this.ctx_clone.getImageData(minX, minY, maxX - minX, maxY - minY);

        // 检查新 canvas 上的每个像素是否位于原始路径内，如果不是，则将该像素设置为透明
        for (let y = 0; y < this.canvas_clone.height; y++) {
            for (let x = 0; x < this.canvas_clone.width; x++) {
                if (!this.isAllBzPointInPath(this.ctx, this.areas, x, y)) {
                    let index = (y * this.canvas_clone.width + x) * 4;
                    imageData.data[index + 3] = 0; // 设置 alpha 通道为 0（透明）
                }
            }
        }
        // 将修改后的图像数据重新绘制到新 canvas 上
        this.ctx_clone.putImageData(imageData, 0, 0);

        // 将新 canvas 转换为 Data URL
        const base64Img = this.canvas_clone.toDataURL();
        // 重置
        this.drawAll(this.ctx_clone, []);

        return base64Img;
    }

    /**
     * 删除第几个区域
     * @param {*} value number 
     * @returns 
     */
    delectArea(value) {
        if (value === '') return;
        const n = Number(value);
        if (Number.isNaN(n)) {
            console.log('请输入数字');
            return;
        }
        if (this.areas.length < n) {
            console.log('区域不存在');
            return;
        }
        this.areas.splice(n, 1);
        this.history.push(deepClone(this.areas));
        this.drawAll(this.ctx, this.areas);
    }

    /**
     * 重置
     */
    reset() {
        this.drawAll(this.ctx, []);
        this.areas.length = 0;
    }

    /**
     * 增加图层
     * @param {*} src 
     */
    addImage(src) {
        const my_canvas = document.createElement("canvas");
        my_canvas.width = this.WIDTH;
        my_canvas.height = this.HEIGHT;
        let my_ctx = my_canvas.getContext("2d");
        const img = new Image();
        img.src = src;
        img.onload = () => {
            // 将图像绘制到 canvas 上
            this.drawImg(this.ctx, img);

            // 将新图层添加入images中
            this.drawImg(my_ctx, img);
            const imageData = my_ctx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
            this.images.push(imageData);

            // 垃圾回收
            my_ctx = null;
        };
    }

    /**
     * 选择图层
     * 从所有的历史图层选择点击位置不为透明的图层
     */
    selectImage(e) {
        if (e.button !== 0) return;
        const {
            x, y
        } = this.getXY(e, this.canvas);
        const index = (y * this.canvas.width + x) * 4;
        for(let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            const alpha = image.data[index + 3];
            if(alpha !== 0) {
                this.drawShadowImage(i);
                console.log(`选择了第${i}张图`);
            }
        }
    }

    /**
     * 为指定图层添加阴影效果
     * @param {*} index 
     */
    drawShadowImage(index) {
        // 首先清空 canvas
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        for (let i = 0; i < this.images.length; i++) {
            const imageData = this.images[i];
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = this.WIDTH;
            tempCanvas.height = this.HEIGHT;
            const tempCtx = tempCanvas.getContext("2d");

            // 在临时 canvas 上绘制原始图像
            tempCtx.putImageData(imageData, 0, 0);

            // 如果是目标图层，应用阴影效果
            if (i === index) {
                // 应用内阴影效果（inset）
                tempCtx.globalCompositeOperation = "source-atop";
                tempCtx.shadowBlur = 10;
                tempCtx.shadowColor = "rgb(0,153,184)";
                tempCtx.shadowOffsetX = 0;
                tempCtx.shadowOffsetY = 0;
                tempCtx.drawImage(tempCanvas, 0, 0);

                this.ctx.shadowBlur = 30;
                this.ctx.shadowColor = "rgb(0,153,184)";
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            } else {
                // 对于非目标图层，设置透明度
                this.ctx.globalAlpha = 0.5;

                // 取消阴影效果
                this.ctx.shadowBlur = 0;
                this.ctx.shadowColor = "rgba(0, 0, 0, 0)";
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }

            // 将图层（可能包含阴影效果）绘制到最终 canvas 上
            this.ctx.drawImage(tempCanvas, 0, 0);

            // 恢复全局透明度
            this.ctx.globalAlpha = 1;
        }
    }
}
