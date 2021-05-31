window.addEventListener("load",()=>{
    const canvas=document.querySelector("#canvas");
    const ctx=canvas.getContext("2d");
    const btn_save_object=document.querySelector("#Save-Object");
    const btn_save_canvas=document.querySelector("#Save-Canvas");

    const btn_start_draw=document.querySelector("#StartDrawing");
    const btn_stop_draw=document.querySelector("#StopDrawing");
    const btn_undo=document.querySelector("#Undo");
    const btn_Transformation=document.querySelector("#Transformation");
    const btn_Search=document.querySelector("#Search");
    const refresh_Search=document.querySelector("#refresh");
    const draw_Curve=document.querySelector("#drawCurve");
    const color=document.querySelector("#color");

    const strokewidth_slider=document.querySelector("#strokewidth_slider");
    const strokewidth_value=document.querySelector("#strokewidth_value");
    const stroke_color=document.querySelector("#stroke_color");
    const fill_color=document.querySelector("#fill_color");
    
    canvas.height=window.innerHeight-100;
    canvas.width=window.innerWidth-100;

    let ispainting=false;
    var toggle_transform=false;
    var toggle_Search=false;
    var toggle_draw_Curve=false;
    var toggle_color=false;
    var store_cords=[];
    var strokecolor=stroke_color.value;
    var fillcolor=fill_color.value;
    var strokewidth=parseInt(strokewidth_slider.value);
    var selected_object={};

    var curve_selected_points=[];
    var bz_curve_points=[];
    var change_point_index=-1;

    strokewidth_value.innerText=strokewidth;

    var screen_objects={};
    var objects_children={};

    function start(e) {
        ispainting=true;
        store_cords.push([{strokecolor,strokewidth},[
                [e.clientX,e.clientY,1]
            ]
        ]);
        draw(e);
    }

    function setparams(params,x,y){
        ctx.lineWidth=params.strokewidth;
        ctx.lineCap="round";
        ctx.strokeStyle=params.strokecolor;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if(!ispainting) return;

        setparams({strokecolor,strokewidth},e.clientX,e.clientY);

        let temp=store_cords.pop();
        temp[1].push([e.clientX,e.clientY,1]);

        store_cords.push(temp);
    }

    function stop() {
        ispainting=false;
        ctx.beginPath();
        
        store_cords.push(["stop",find_minmax(store_cords[store_cords.length-1])]);
        console.log(store_cords);
    }

    function clearcanvas(isundo=false) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let parent=document.querySelector("#parent-childs");
        let child = parent.lastElementChild;
        
        if(isundo){
            delete screen_objects[child.firstElementChild.innerText];
            parent.removeChild(child);
        }
        else{
            screen_objects={};
 
            while (child) {
                parent.removeChild(child);
                child = parent.lastElementChild;
            }
        }
        console.log(screen_objects);

    }

    function find_minmax(coords){

        let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;

        const points = coords[1];

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const xver=point[0];
            const yver=point[1];

            minx=Math.min(xver , minx);
            maxx=Math.max(xver , maxx);

            miny=Math.min(yver , miny);
            maxy=Math.max(yver , maxy);
        }

        return { stroke: coords[0].strokewidth , minx , maxx , miny , maxy };
    }

    function calculate_centroid(temp_coords){
        let numofPoints=0;
        for (let index = 0; index < temp_coords.length; index++) {
            const line = temp_coords[index];
            if(typeof line[0] != "string"){
                numofPoints+=line[1].length;
            }
        }

        // console.log(numofPoints);
    
        let centroid={X:0,Y:0};

        for (let index = 0; index < temp_coords.length; index++) {
            const line = temp_coords[index];
            if(typeof line[0] != "string"){

                const points=line[1];
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    centroid.X+=point[0];
                    centroid.Y+=point[1];
                }
            }
        }

        centroid.X/=numofPoints;
        centroid.Y/=numofPoints;

        return centroid;
    }

    function newdraw(x,y,temp_coords){
        let centroid=calculate_centroid(temp_coords);

        let xchange,ychange;
        xchange=x - centroid.X;
        ychange=y - centroid.Y;

        let stroke = -Infinity, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
        let tmp_arr=[],params={};

        for (let index = 0; index < temp_coords.length; index++) {
            
            const line = temp_coords[index];

            if(typeof line[0] != "string"){
                params=line[0];

                const points=line[1];
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    const xver=point[0];
                    const yver=point[1];

                    if(params.colorcoords !== undefined){
                        putpixel(xver+xchange,yver+ychange,params.strokecolor);
                    }
                    else{
                        setparams(params,xver+xchange,yver+ychange);
                    }
                    
                    tmp_arr.push([xver+xchange,yver+ychange,1]);
                    
                }
            }
            else{
                let lineparams=find_minmax([params,tmp_arr]);

                minx=Math.min(lineparams.minx , minx);
                maxx=Math.max(lineparams.maxx , maxx);

                miny=Math.min(lineparams.miny , miny);
                maxy=Math.max(lineparams.maxy , maxy);

                stroke=Math.max(lineparams.stroke , stroke);

                store_cords.push([params,tmp_arr]);
                tmp_arr=[];
                params={};

                if( index !== temp_coords.length-1)    store_cords.push(["stop",lineparams]);

                ctx.beginPath();
            }
        }

        store_cords.push([ "end" , temp_coords.length , { stroke , minx , maxx , miny , maxy }]);
        console.log(store_cords);
    }

    function CreateObject(){
        let temp_coords=store_cords;
        clearcanvas();
        store_cords=[];

        let obj_name = prompt("Please enter object name", "Object");

        if (obj_name === null)     obj_name=new Date();

        let button = document.createElement("button");
        button.innerText = obj_name;

        let parent = document.querySelector("#root");
        parent.appendChild(button);

        button.addEventListener ("click", function() {

            function callback(e){
                let start_index=store_cords.length;
                let end_index=(temp_coords.length+store_cords.length)-1;

                let new_obj_name = prompt("Please enter object name", "Object");

                if (new_obj_name === null)     new_obj_name=new Date();

                screen_objects[ new_obj_name ] = {from : start_index ,to : end_index};

                //main drawing function
                repaint();
                newdraw(e.clientX,e.clientY,temp_coords);
                //undo();

                let btn = document.createElement("button");
                btn.innerText = new_obj_name;
                btn.onclick=()=>{
                    //console.log("Hello");
                    repaint();
                    let line=store_cords[end_index];
                    let { stroke , minx , maxx , miny , maxy }=line[line.length-1];

                    let shift=5;

                    minx -= (shift + stroke/2);
                    miny -= (shift + stroke/2);
                    maxx += (shift + stroke/2);
                    maxy += (shift + stroke/2);

                    selected_object={from : start_index ,to : end_index};

                    ctx.lineWidth=1;
                    ctx.strokeStyle="blue";

                    ctx.rect(minx , miny , maxx - minx , maxy - miny );
                    ctx.stroke();
                }

                let input = document.createElement("input");
                input.type="text";
                input.addEventListener("keyup", (e) => {
                    if (e.key === "Enter") {
                        console.log(e.target.value);
                        objects_children[`${start_index}:${end_index}`]={
                            name:   new_obj_name,
                            children:   e.target.value.split(",")
                        }
                        console.log(objects_children);
                    }
                })

                let div = document.createElement("div");
                div.id=`${start_index}:${end_index}`;
                div.appendChild(btn);
                div.appendChild(input);

                let parent = document.querySelector("#parent-childs");
                parent.appendChild(div);

                console.log(screen_objects);

            }

            canvas.addEventListener("mousedown",callback,{
                // This will invoke the event once and de-register it afterward
                once: true
            });

        });
    }

    function toggle_on_draw(){
        canvas.addEventListener("mousedown",start);
        canvas.addEventListener("mousemove",draw);
        canvas.addEventListener("mouseup",stop);
    }

    function toggle_off_draw(){
        canvas.removeEventListener("mousedown",start);
        canvas.removeEventListener("mousemove",draw);
        canvas.removeEventListener("mouseup",stop);
    }

    function undo(){

        clearcanvas(true);
        ctx.beginPath();

        let popped_coords=[];

        let last_coords=store_cords.pop();

        if(last_coords[0] === "end"){
            let temp=0;
            for (let index = store_cords.length - 1; temp !== last_coords[1]-1 ; index--) {
                
                popped_coords.push(store_cords.pop());

                temp++;
            }

            popped_coords.reverse();
            popped_coords.push([ "end" , last_coords[1]]);
        }
        else{
            popped_coords.push(store_cords.pop());
            popped_coords.push(last_coords);
        }

        for (let index = 0; index < store_cords.length; index++) {
            const line = store_cords[index];
            if(typeof line[0] != "string"){

                const points=line[1];
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    const xver=point[0];
                    const yver=point[1];

                    if(line[0].colorcoords !== undefined){
                        putpixel(xver,yver,line[0].strokecolor);
                    }
                    else{
                        setparams(line[0],xver,yver);
                    }
                }
            }
            else{
                ctx.beginPath();
            }
        }

        // console.log(popped_coords);

        return popped_coords;
    }

    btn_start_draw.addEventListener("click",toggle_on_draw);
    btn_stop_draw.addEventListener("click",toggle_off_draw);
    btn_undo.addEventListener("click",undo);
    btn_save_object.addEventListener("click",CreateObject);
    btn_save_canvas.addEventListener("click",()=>{
        repaint();
        let image = canvas.toDataURL();
        // let aLink = document.createElement('a');
        let image_el = document.createElement("IMG");

        let parent = document.querySelector("#images");
        parent.appendChild(image_el);
        
        image_el.src=image;

    });

    btn_Transformation.addEventListener("click",()=>{
        toggle_transform=!toggle_transform;
    });

    btn_Search.addEventListener("click",()=>{
        toggle_Search=!toggle_Search;
    });

    refresh_Search.addEventListener("click",()=>{
        repaint();
        toggle_transform=false;
        toggle_Search=false;
        toggle_draw_Curve=false;
        toggle_off_draw();
        curve_selected_points=[];
        bz_curve_points=[];
        change_point_index=-1;
        selected_object={};
    });

    draw_Curve.addEventListener("click",()=>{
        if(toggle_draw_Curve){
            store_cords.push(bz_curve_points);
            store_cords.push(["stop",find_minmax(bz_curve_points)]);
            console.log(store_cords);
            repaint();
            curve_selected_points=[];
            bz_curve_points=[];
            change_point_index=-1;
        }
        toggle_draw_Curve=!toggle_draw_Curve;
    });

    color.addEventListener("click",()=>{
        toggle_color=!toggle_color;
    });

    strokewidth_slider.oninput = function() {
        strokewidth = this.value;
        strokewidth_value.innerText= this.value;
    }

    stroke_color.oninput = function() {
        strokecolor = this.value;
    }

    fill_color.oninput = function() {
        fillcolor = this.value;
    }

    function repaint() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();

        for (let index = 0; index < store_cords.length; index++) {
            const line = store_cords[index];
            if(typeof line[0] != "string"){

                const points=line[1];
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    const xver=point[0];
                    const yver=point[1];

                    if(line[0].colorcoords !== undefined){
                        putpixel(xver,yver,line[0].strokecolor,line[0].strokewidth);
                    }
                    else{
                        setparams(line[0],xver,yver);
                    }

                }
            }
            else{
                ctx.beginPath();
            }
        }
    }

    function find_minmax_forObject(coords) {
        let stroke = -Infinity, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;

        for (let index = 0; index < coords.length; index++) {
            
            const line = coords[index];

            if(typeof line[0] == "string"){
               
                let lineparams=line[line.length-1];

                minx=Math.min(lineparams.minx , minx);
                maxx=Math.max(lineparams.maxx , maxx);

                miny=Math.min(lineparams.miny , miny);
                maxy=Math.max(lineparams.maxy , maxy);

                stroke=Math.max(lineparams.stroke , stroke);
            }
        }

        if(coords.length>2)
            coords[coords.length-1]=[ "end" , coords.length , { stroke , minx , maxx , miny , maxy }];
        
        return coords;
    }

    function matrixDot (A, B) {
        let result = new Array(A.length).fill(0).map(row => new Array(B[0].length).fill(0));
    
        return result.map((row, i) => {
            return row.map((_, j) => {
                return A[i].reduce((sum, elm, k) => sum + (elm*B[k][j]) ,0)
            })
        })
    }

    // function rotate_children(from,to,angle,rotating_point) {

    //     const parent= objects_children[`${from}:${to}`];
    //     if(  parent !== undefined ){
    //         const children = parent.children;

    //         for (let index = 0; index < children.length; index++) {

    //             const childname = children[index];
    //             const childloc=screen_objects[childname];

    //             if( childloc !== undefined ){
    //                 let stroke = -Infinity, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;

    //                 //translate
    //                 for (let index = childloc.from; index <= childloc.to; index++) {
    //                     const line = store_cords[index];
    //                     if(typeof line[0] != "string"){
    //                         const points=line[1];
            
    //                         store_cords[index] = [ line[0] , matrixDot(points,[ [ 1 , 0 , 0 ] , [ 0 , 1 , 0 ] , [ -rotating_point.X , -rotating_point.Y , 1 ] ]) ];
    //                     }
    //                 }

    //                 //rotate
    //                 for (let index = childloc.from; index <= childloc.to; index++) {
    //                     const line = store_cords[index];
    //                     if(typeof line[0] != "string"){
    //                         const points=line[1];
            
    //                         store_cords[index] = [ line[0] , matrixDot(points,[ [ Math.cos(angle) , -Math.sin(angle) , 0 ] , [ Math.sin(angle) , Math.cos(angle) , 0 ] , [ 0 , 0 , 1 ] ]) ];
    //                     }
    //                 }


    //                 //inverse translate
    //                 for (let index = childloc.from; index <= childloc.to; index++) {
    //                     const line = store_cords[index];
    //                     if(typeof line[0] != "string"){
    //                         const points=line[1];
            
    //                         store_cords[index] = [ line[0] , matrixDot(points,[ [ 1 , 0 , 0 ] , [ 0 , 1 , 0 ] , [ rotating_point.X , rotating_point.Y , 1 ] ]) ];
    //                     }
    //                     else {
    //                         line[line.length-1]=find_minmax(store_cords[index-1]);

    //                         let lineparams=line[line.length-1];

    //                         minx=Math.min(lineparams.minx , minx);
    //                         maxx=Math.max(lineparams.maxx , maxx);

    //                         miny=Math.min(lineparams.miny , miny);
    //                         maxy=Math.max(lineparams.maxy , maxy);

    //                         stroke=Math.max(lineparams.stroke , stroke);

    //                         store_cords[index] = line;
    //                     }
    //                 }

    //                 let lastlinelength=store_cords[childloc.to].length;
    //                 store_cords[childloc.to][lastlinelength-1]={ stroke , minx , maxx , miny , maxy };

    //                 rotate_children(childloc.from,childloc.to,angle,calculate_centroid(store_cords.slice(childloc.from,childloc.to+1)));

    //             }

    //         }
    //     }

    // }

    // function rotate_polygon(poppedcoords,angle,rotating_point){     //rotate w. r. t. point here i had given centroid by default
    //     let temp_coords=[],rotate_coords=[],result_coords=[];

    //     temp_coords=translate_polygon(poppedcoords, -rotating_point.X, -rotating_point.Y);

    //     for (let index = 0; index < temp_coords.length; index++) {
    //         const line = temp_coords[index];
    //         if(typeof line[0] != "string"){

    //             const points=line[1];

    //             rotate_coords.push([line[0], matrixDot(points,[ [ Math.cos(angle) , -Math.sin(angle) , 0 ] , [ Math.sin(angle) , Math.cos(angle) , 0 ] , [ 0 , 0 , 1 ] ]) ]);
    //         }
    //         else{
                
    //             rotate_coords.push(line);
    //         }
    //     }

    //     result_coords=translate_polygon(rotate_coords, rotating_point.X, rotating_point.Y);

    //     //transform all childrens as well
    //     rotate_children(selected_object.from,selected_object.to,angle,rotating_point);

    //     return result_coords;
    // }

//another method of rotation

    // function angle_betw_lines(m1,m2){
    //     return Math.atan( Math.abs( ( m1 - m2 )/(1 + m1 * m2) ) );
    // }

    // function rotate_children(prev_joint,from,to,angle,x,y,prevm) {

    //     const parent= objects_children[`${from}:${to}`];
    //     if(  parent !== undefined ){
    //         const children = parent.children;

    //         for (let index = 0; index < children.length; index++) {

    //             const childname = children[index];
    //             const childloc=screen_objects[childname];

    //             if( childloc !== undefined ){
    //                 let stroke = -Infinity, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;

    //                 let new_joint=calculate_centroid(store_cords.slice(childloc.from,childloc.to+1));
    //                 let l=Math.sqrt( Math.pow(prev_joint.X - new_joint.X , 2) + Math.pow(prev_joint.Y - new_joint.Y , 2) );
    //                 let m=Math.atan(prev_joint.Y - new_joint.Y / prev_joint.X - new_joint.X);

    //                 let new_ang=angle + angle_betw_lines(m,prevm);

    //                 let newx=l*Math.cos(new_ang)+x;
    //                 let newy=l*Math.sin(new_ang)+y;

    //                 rotate_children(new_joint,childloc.from,childloc.to,new_ang,newx,newy,m);

    //                 let xchange,ychange;
    //                 xchange=newx - new_joint.X;
    //                 ychange=newy - new_joint.Y;

    //                 for (let index = childloc.from; index <= childloc.to; index++) {
    //                     const line = store_cords[index];
    //                     if(typeof line[0] != "string"){
    //                         const points=line[1];
            
    //                         store_cords[index] = [ line[0] , matrixDot(points,[ [ 1 , 0 , 0 ] , [ 0 , 1 , 0 ] , [ xchange , ychange , 1 ] ]) ];
    //                     }
    //                     else {
    //                         line[line.length-1]=find_minmax(store_cords[index-1]);

    //                         let lineparams=line[line.length-1];

    //                         minx=Math.min(lineparams.minx , minx);
    //                         maxx=Math.max(lineparams.maxx , maxx);

    //                         miny=Math.min(lineparams.miny , miny);
    //                         maxy=Math.max(lineparams.maxy , maxy);

    //                         stroke=Math.max(lineparams.stroke , stroke);

    //                         store_cords[index] = line;
    //                     }
    //                 }

    //                 let lastlinelength=store_cords[childloc.to].length;
    //                 store_cords[childloc.to][lastlinelength-1]={ stroke , minx , maxx , miny , maxy };

    //             }

    //         }
    //     }

    // }

    // function rotate_polygon(poppedcoords,angle,rotating_point){     //rotate w. r. t. point here i had given centroid by default
    //     let temp_coords=[],rotate_coords=[],result_coords=[];

    //     temp_coords=translate_polygon(poppedcoords, -rotating_point.X, -rotating_point.Y);

    //     for (let index = 0; index < temp_coords.length; index++) {
    //         const line = temp_coords[index];
    //         if(typeof line[0] != "string"){

    //             const points=line[1];

    //             rotate_coords.push([line[0], matrixDot(points,[ [ Math.cos(angle) , -Math.sin(angle) , 0 ] , [ Math.sin(angle) , Math.cos(angle) , 0 ] , [ 0 , 0 , 1 ] ]) ]);
    //         }
    //         else{
                
    //             rotate_coords.push(line);
    //         }
    //     }

    //     result_coords=translate_polygon(rotate_coords, rotating_point.X, rotating_point.Y);

    //     //transform all childrens as well
    //     //let prev_joint=calculate_centroid(store_cords.slice(selected_object.from,selected_object.to+1));
    //     rotate_children(poppedcoords,selected_object.from,selected_object.to,angle,0,0,0);

    //     return result_coords;
    // }

    function translate_children(from,to,xchange,ychange) {
        const parent= objects_children[`${from}:${to}`];

        if(  parent !== undefined ){
            const children = parent.children;

            for (let index = 0; index < children.length; index++) {

                const childname = children[index];
                const childloc=screen_objects[childname];

                if( childloc !== undefined ){
                    let stroke = -Infinity, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;

                    for (let index = childloc.from; index <= childloc.to; index++) {
                        const line = store_cords[index];
                        if(typeof line[0] != "string"){
                            const points=line[1];
            
                            store_cords[index] = [ line[0] , matrixDot(points,[ [ 1 , 0 , 0 ] , [ 0 , 1 , 0 ] , [ xchange , ychange , 1 ] ]) ];
                        }
                        else {
                            line[line.length-1]=find_minmax(store_cords[index-1]);

                            let lineparams=line[line.length-1];

                            minx=Math.min(lineparams.minx , minx);
                            maxx=Math.max(lineparams.maxx , maxx);

                            miny=Math.min(lineparams.miny , miny);
                            maxy=Math.max(lineparams.maxy , maxy);

                            stroke=Math.max(lineparams.stroke , stroke);

                            store_cords[index] = line;
                        }
                    }

                    let lastlinelength=store_cords[childloc.to].length;
                    store_cords[childloc.to][lastlinelength-1]={ stroke , minx , maxx , miny , maxy };

                    translate_children(childloc.from,childloc.to,xchange,ychange);

                }

            }
        }
    }

    function translate_polygon(poppedcoords,xchange,ychange){
        let result_coords=[];

        // console.log(poppedcoords);

        for (let index = 0; index < poppedcoords.length; index++) {
            const line = poppedcoords[index];
            if(typeof line[0] != "string"){
                const points=line[1];

                result_coords.push([line[0], matrixDot(points,[ [ 1 , 0 , 0 ] , [ 0 , 1 , 0 ] , [ xchange , ychange , 1 ] ]) ]);
            }
            else {
                line[line.length-1]=find_minmax(result_coords[index-1]);
                result_coords.push(line);
            }
        }

        //transform all childrens as well
        translate_children(selected_object.from,selected_object.to,xchange,ychange);

        return result_coords;

    }

    function scale_polygon(poppedcoords,xchange,ychange){
        let result_coords=[];
        let params="";

        for (let index = 0; index < poppedcoords.length; index++) {
            const line = poppedcoords[index];
            if(typeof line[0] != "string"){
                params=line[0];

                const points=line[1];

                let new_strokewidth=(xchange>ychange)?params.strokewidth*xchange:params.strokewidth*ychange;

                result_coords.push([
                    { 
                        strokewidth:new_strokewidth,
                        strokecolor:params.strokecolor
                    }, matrixDot(points,[ [ xchange , 0 , 0 ] , [ 0 , ychange , 0 ] , [ 0 , 0 , 1 ] ]) ]);
            }
            else{
                line[line.length-1]=find_minmax(result_coords[index-1]); 
                result_coords.push(line);
            }
        }

        return result_coords;

    }

    function settle_after_transform(previous_coords,new_coords){
        let result_coords=[];

        let prev_centroid=calculate_centroid(previous_coords);

        let new_centroid=calculate_centroid(new_coords);

        let newx,newy;
        newx=new_centroid.X - prev_centroid.X;
        newy=new_centroid.Y - prev_centroid.Y;

        result_coords=translate_polygon(new_coords,-newx,-newy);

        return result_coords;

    }

    function show_polygon(new_coords){

        new_coords=find_minmax_forObject(new_coords);

        //console.log("Hi:",new_coords);

        let i=selected_object.from;

        for (let index = 0; index < new_coords.length; index++) {

            const line = new_coords[index];

            store_cords[i++]=line;
        }
        
        //console.log("Helllo",store_cords);

        repaint();

        let last_line=new_coords[new_coords.length-1];
        let { stroke , minx , maxx , miny , maxy }=last_line[last_line.length-1];

        let shift=5;

        minx -= (shift + stroke/2);
        miny -= (shift + stroke/2);
        maxx += (shift + stroke/2);
        maxy += (shift + stroke/2);

        ctx.lineWidth=1;
        ctx.strokeStyle="blue";
        ctx.rect(minx , miny , maxx - minx , maxy - miny );
        ctx.stroke();

    }

    function reflect_polygon(poppedcoords,reflecting_point,vertical){   //w. r. t. line parallel to y axis or x axis
        let rotate_coords=[],temp_coords=[],result_coords=[],x,y;

        if(vertical){
            x=1;
            y=-1;
        }
        else{
            x=-1;
            y=1;
        }
        
        rotate_coords=rotate_polygon(poppedcoords, ((3.14 / 180) * 90) , reflecting_point);

        temp_coords=scale_polygon(rotate_coords,x,y);

        result_coords=rotate_polygon(temp_coords, -((3.14 / 180) * 90) , reflecting_point);

        return result_coords;
    }

    function find_transforming_object(findindex){
        let last_coords=store_cords[findindex];


        if(last_coords[0] === "end"){
            return {from: findindex-(last_coords[1]-1),to:findindex};
        }

        return {from: findindex-1,to:findindex};
    }

    function initializePolygons() {
        let result_coords=[];

        for (let index = selected_object.from; index <= selected_object.to; index++) {
            const line = store_cords[index];
            result_coords.push(line);
        }

        return result_coords;
    }

    document.addEventListener("keydown", function(event) {

        if(toggle_transform && store_cords.length!=0){
            event.preventDefault();
            const key = event.key;
            let poppedcoords;
            let result_coords=[],point;
            let choosen=true;

            poppedcoords=initializePolygons();

            switch (key) {
                case "ArrowLeft":
                    result_coords=translate_polygon(poppedcoords,-10,0);
                    break;
                case "ArrowRight":
                    result_coords=translate_polygon(poppedcoords,10,0);
                    break;
                case "ArrowUp":
                    result_coords=translate_polygon(poppedcoords,0,-10);
                    break;
                case "ArrowDown":
                    result_coords=translate_polygon(poppedcoords,0,10);
                    break;
                case "t":
                    point = calculate_centroid(poppedcoords);
                    result_coords=rotate_polygon(poppedcoords,0.1,point);
                    break;
                case "r":
                    point = calculate_centroid(poppedcoords);
                    result_coords=rotate_polygon(poppedcoords,-0.1,point);
                    break;
                case "e":
                    result_coords=reflect_polygon(poppedcoords,{ X : canvas.width /2 ,Y: 0},true);
                    break;
                case "w":
                    result_coords=reflect_polygon(poppedcoords,{ X : 0 ,Y: canvas.height /2 },false);
                    break;
                case "a":
                    result_coords=scale_polygon(poppedcoords,1.1,1.1);
                    result_coords=settle_after_transform(poppedcoords,result_coords);
                    break;
                case "s":
                    result_coords=scale_polygon(poppedcoords,0.9,0.9);
                    result_coords=settle_after_transform(poppedcoords,result_coords);
                    break;
                case "d":
                    result_coords=scale_polygon(poppedcoords,1.1,1);
                    result_coords=settle_after_transform(poppedcoords,result_coords);
                    break;
                case "f":
                    result_coords=scale_polygon(poppedcoords,1,1.1);
                    result_coords=settle_after_transform(poppedcoords,result_coords);
                    break;
                default:
                    choosen=false;
                    break;
            }

            if(choosen)     show_polygon(result_coords);
            else        show_polygon(poppedcoords);

        }

    });

    canvas.addEventListener("click",(e)=>{
        //newdraw(e.clientX,e.clientY,temp_coords);
        //console.log(ctx.getImageData(e.clientX, e.clientY, 1 , 1).data);
        repaint();
        if(toggle_Search){
            repaint();
            let objects=[];
            // let lines=[];
            for (let index = 1; index < store_cords.length; index+=2) {
                const line = store_cords[index];
                if(typeof line[0] == "string"){
    
                    let { stroke , minx , maxx , miny , maxy }=line[line.length-1];
                    let shift=5;

                    minx -= (shift + stroke/2);
                    miny -= (shift + stroke/2);
                    maxx += (shift + stroke/2);
                    maxy += (shift + stroke/2);
                    
                    if( e.clientX > minx && e.clientX < maxx && e.clientY > miny && e.clientY < maxy ){

                        // if(line[0] == "stop")   lines.push(index);
                        // else 
                        if(line[0] == "end")   objects.push(index);

                    }
                }
            }

            let index;
            const shift=5;

            // if(lines.length!=0){
            //     index=lines[0];
            // }
            // else 
            if(objects.length!=0){
                index=objects[0];
            }

            if(index != undefined){
                const line = store_cords[index];
                let { stroke , minx , maxx , miny , maxy }=line[line.length-1];

                minx -= (shift + stroke/2);
                miny -= (shift + stroke/2);
                maxx += (shift + stroke/2);
                maxy += (shift + stroke/2);

                selected_object = find_transforming_object(index);
                //create rectangle
                ctx.lineWidth=1;
                //ctx.lineCap="round";
                ctx.strokeStyle="blue";

                ctx.rect(minx , miny , maxx - minx , maxy - miny );
                ctx.stroke();
            }

        }
        else if(toggle_draw_Curve){

            let already_selected_index=-1;
            let shift=5;

            if(change_point_index == -1){

                for (let index = 0; index < curve_selected_points.length; index++) {
                    const el = curve_selected_points[index];

                    if((e.clientX >= el.x-shift && e.clientX <= el.x+shift ) && (e.clientY >= el.y-shift && e.clientY <= el.y+shift)){
                        already_selected_index = index;
                        break;
                    }
                    
                }

                console.log(already_selected_index);

                if(already_selected_index === -1){
                    curve_selected_points.push({x: e.clientX,y: e.clientY});
                }
                else{
                    //curve_selected_points[already_selected_index]={x: e.clientX,y: e.clientY};
                    change_point_index=already_selected_index;
                }

            }
            else{
                curve_selected_points[change_point_index]={x: e.clientX,y: e.clientY};
            }

            if(curve_selected_points.length>1){
                BezierCurveDrawer(shift);
            }
            else{
                //draw rectangle
                ctx.lineWidth=4;
                ctx.strokeStyle="blue";
                ctx.arc(e.clientX,e.clientY,shift,0, 2 * Math.PI);
                //ctx.rect(e.clientX-shift , e.clientY-shift , shift*2 , shift*2 );
                ctx.stroke();
            }

        }
        else if(toggle_color){
            let isvisited = new Array(canvas.height);

            for (var i = 0; i < isvisited.length; i++) {
                isvisited[i] = new Array(canvas.width).fill(false);
            }

            let newcolorcoords=floodfill( isvisited , e.clientX , e.clientY , getpixel(e.clientX,e.clientY) , fillcolor );
            store_cords.push(newcolorcoords);
            store_cords.push(["stop",find_minmax(newcolorcoords)]);
            console.log(store_cords);
        }
        
    });

    canvas.addEventListener('contextmenu', (e)=> {
        e.preventDefault();
        change_point_index=-1;
        return false;
    }, false);

    function factorial(n) {
        if(n<0)    
            return(-1); /*Wrong value*/      
        if(n==0)    
            return(1);  /*Terminating condition*/    
        else    
        {    
            return(n*factorial(n-1));        
        }
    }

    function nCr(n,r) {
        return( factorial(n) / ( factorial(r) * factorial(n-r) ) );
    }

    function BezierCurve(points) {
        let n=points.length;
        let curvepoints=[];
        for(let u=0; u <= 1 ; u += 0.01 ){

            let p={x:0,y:0};

            for(let i=0 ; i<n ; i++){
                let B=nCr(n-1,i)*Math.pow((1-u),(n-1)-i)*Math.pow(u,i);
                let px=points[i].x*B;
                let py=points[i].y*B;
                
                p.x+=px;
                p.y+=py;
                
            }

            curvepoints.push([ p.x , p.y , 1 ]);
        }
        
        return curvepoints;
    }

    function BezierCurveDrawer(shift) {
        bz_curve_points=[{strokecolor,strokewidth},BezierCurve(curve_selected_points)];

        repaint();
        ctx.lineWidth=4;
        ctx.strokeStyle="blue";

        for (let index = 0; index < curve_selected_points.length; index++) {
            ctx.beginPath();

            const point = curve_selected_points[index];
            ctx.arc(point.x,point.y,shift,0, 2 * Math.PI);
            ctx.stroke();
            //ctx.rect(point.x-shift , point.y-shift , shift*2 , shift*2 );
        }

        ctx.beginPath();

        for (let index = 0; index < bz_curve_points[1].length; index++) {
            const prev = bz_curve_points[1][index];
            //const next = bz_curve_points[1][index+1];
        
            setparams({strokecolor,strokewidth},prev[0],prev[1]);
            //setparams({strokecolor,strokewidth},next[0],next[1]);
        }

        ctx.beginPath();
    }

    function getpixel(x,y){
        return ctx.getImageData(x, y, 1 , 1).data;
    }

    function putpixel(x,y,color,stroke=1){
        ctx.fillRect(x,y,stroke,stroke);
        ctx.fillStyle=color;
    }

    function floodfill(isvisited,x,y,oldcol,newcol){
        let fillStack = [];
        let colorcoords=[];

        fillStack.push([x, y]);

        while(fillStack.length > 0)
        {
            var [x, y] = fillStack.pop();

            if(!(y >= 0 && y < isvisited.length && x >= 0 && x < isvisited[0].length))
                continue;

            if(isvisited[y][x] == true)
                continue;

            isvisited[y][x]=true;

            if( JSON.stringify( getpixel(x,y) ) === JSON.stringify( oldcol ) ){
                putpixel(x,y,newcol);
                colorcoords.push([x, y, 1]);

                fillStack.push([x + 1, y]);
                fillStack.push([x - 1, y]);
                fillStack.push([x, y + 1]);
                fillStack.push([x, y - 1]);
            }
            else{
                putpixel(x,y,newcol);
                colorcoords.push([x, y, 1]);
            }
        }

        return [ { strokewidth:1 , strokecolor:newcol , colorcoords:true } , colorcoords ];
    }

});