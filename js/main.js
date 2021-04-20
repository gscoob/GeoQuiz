// JavaScript by Greg Farnsworth, 2020
// Final Commit 5/5/2020
// Latest Release 2020.08.23
//

(function(){

//===========================//
//==pseudo-global variables==//
    
    var answerArray = ["geo_id",
                       "geo_name",
                       "geo_abbrv",
                       "geo_pop",
                       "geo_acres",
                       "geo_dens"
                      ],
        questionArray = ["q_id",
                         "question",
                         "answer_state",
                         "answer_text",
                         "raw_prefix",
                         "raw_suffix",
                         "norm_prefix",
                         "norm_suffix"
                        ],
        reactArray = [ ["Great job!",
                        "Way to go!",
                        "You really know your stuff!",
                        "Smarty pants!",
                        "Piece of cake!"],
                       ["Oh, so close...",
                        "You almost had it...",
                        "Missed it by that much...",
                        "That's a tough loss...",
                        "Who knew..."]
                     ];

    var expressed = "NULL",
        displayed = "NULL",
        questionText = "NULL",
        questionID = "NULL",
        selectedSateName = "NULL",
        selectedStateID = "NULL",
        correctStateName = "NULL",
        correctStateID = "NULL",
        lowestStateName = "NULL",
        lowestStateID = "NULL",
        answerText = "NULL",
        answerState = "NULL",
        qCat = "NULL";
    
    var playerResults, gameStatus, scorAi, scorCi, scorSi;
    var radius = 10;
    var centroids, areas, remainQsArray;
    
    var questionData;
    var answerData;
    var colorClasses;
    var runIntro = true;
//    var runTutorial = false;    
    var animate = true;
    
    var comma = d3.format(",");

    
//==================================//    
//==begin script when window loads==//
    
    window.onload = setPage();

    
    //set up choropleth map
    function setPage(){
        
        gameStatus = "Loading"

        buildHeader()
        buildRuleBox()

        //create new svg container for the map
        var map = d3.select(".flex")
            .append("svg")
            .attr("class", "map")
            .attr("width", 958.1)
            .attr("height", 595.5);
        
        var scaleW = ((window.innerWidth*0.65)/958.1)
        var scaleH = ((window.innerHeight*0.75)/595.5)
        scaleW.toPrecision(2)
        scaleH.toPrecision(2)
                
        d3.select(".map").attr("transform", "scale("+scaleW+","+scaleH+")")
        
        var mapTop = d3.select(".map").node().getBoundingClientRect().top
        var flexTop = d3.select(".flex").node().getBoundingClientRect().top
        var shiftMap = (flexTop - mapTop)

        d3.select(".map").attr("transform", "scale("+scaleW+","+scaleH+") translate(0,"+shiftMap+")")
        
        //create Albers equal area conic projection centered on us
        var projection = d3.geoAlbers()
              .parallels([32, 45])
              .rotate([99, 0])
              .center([2, 40.25])
              .scale(1300);

        var path = d3.geoPath()
            .projection(projection);

        d3.queue()
            .defer(d3.csv, "data/dataQuestions.csv") //load attributes from csv
            .defer(d3.csv, "data/dataAnswers.csv") //load attributes from csv
            .defer(d3.json, "data/Country.topojson") //load background spatial data
            .defer(d3.json, "data/State.topojson") //load choropleth spatial data
            .await(callback);

        function callback(error, csvQs, csvAs, tCountry, tState){

            questionData = csvQs;
            answerData = csvAs;
console.log(csvQs);
            console.log(questionData);
            
            for (var i=0; i<questionData.length; i++){
                answerArray.push(questionData[i].q_id+"raw")
                answerArray.push(questionData[i].q_id+"norm")
            }
console.log(answerArray);
            createButtons(questionData);
            
            //place graticule on the map
            drawGraticule(map, path);

            //translate na and us TopoJSONs
            var mCountry = topojson.feature(tCountry, tCountry.objects.Country),
                mState = topojson.feature(tState, tState.objects.State).features;
            
            //add na countries to map
            var countries = map.append("path")
                .datum(mCountry)
                .attr("class", "countries")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            mState = joinStateData(mState, answerData);

            //add enumeration units to the map
            drawStates(mState, map, path);
            
            buildScoreBox();
        };
    }; //end of setMap()

    
    
    //function to create dynamic label
    function buildHeader() {            
        var headTitle = d3.select(".headtitle")
            .append("div")
            .attr("id", "title")
            .text('The "Lower 48" Geo Quiz');
        
        d3.select("#aniYN")
            .on("click", function(){
                animate = !animate;
            });
    };
        
    
    function buildRuleBox(){
    
        var ruleH = "How To Play"
        
        var rules = '<ol><li id="rul">Click on the Green Button to Scroll Through the Questions</li><li id="rul">Click on a State to Choose It as Your Answer</li><li id="rul">Click on the Red or Green "Results" Banner to Remove It.</li><li id="rul">Click on the Blue "Game Over" Banner to Start the Game Again!</li></ol>'
        
        d3.select(".rule")
            .append("div")
            .attr("class", "rulebox")            
    
        d3.select(".rulebox")
            .append("div")
            .attr("class", "rulehead")
            .html(ruleH);
        d3.select(".rulebox")
            .append("div")
            .attr("class", "rulegoo")
            .html(rules);
    }
    
    
    function buildScoreBox(){
    
        d3.selectAll(".scorebox").remove();
        
        var scorH = "Game Progress"
        var scor1 = '<span id="sco">Remaining</span>'
        var scor2 = '<span id="sco">Answered</span>'
        var scor3 = '<span id="sco">Correct</span>'
        var scor4 = '<span id="sco">Score</span>'

        var scorR = questionData.length - 1
                console.log(scorR);
        var scorA = "0"
        var scorC = "?"
        var scorS = "?"
        
        scorAi = scorCi = scorSi = 0
        
        var scorebox = d3.select(".score")
            .append("div")
            .attr("class", "scorebox")
        
        scorebox.append("div")
            .attr("class", "scorehead")
            .html(scorH);
        scorebox.append("div")
            .attr("class", "scoregoo")
            .html(scor1);
         scorebox.append("div")
            .attr("class", "scorenbr")
            .attr("id", "scorR")
            .html(scorR);        
        scorebox.append("div")
            .attr("class", "scoregoo")
            .html(scor2);
         scorebox.append("div")
            .attr("class", "scorenbr")
            .attr("id", "scorA")
            .html(scorA);
        scorebox.append("div")
            .attr("class", "scoregoo")
            .html(scor3);
         scorebox.append("div")
            .attr("class", "scorenbr")
            .attr("id", "scorC")
            .html(scorC);
        scorebox.append("div")
            .attr("class", "scoregoo")
            .html(scor4);
         scorebox.append("div")
            .attr("class", "scorenbr")
            .attr("id", "scorS")
            .html(scorS);
    }
    
    
    function drawGraticule(map, path){
        
        var graticule = d3.geoGraticule()
            .step([5, 5]); 

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) 
            .attr("class", "gratBackground") 
            .attr("d", path) 

        var gratLines = map.selectAll(".gratLines") 
            .data(graticule.lines()) 
            .enter() 
            .append("path") 
            .attr("class", "gratLines") 
            .attr("d", path); 
    };

    
    function joinStateData(mState, csvData){
        
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvState = csvData[i]; 
            var csvKey = csvState.geo_name; 

            //loop through geojson regions to find correct region
            for (var a=0; a<mState.length; a++){

                var geojsonProps = mState[a].properties; 
                var geojsonKey = geojsonProps.geo_name; 
                
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    answerArray.forEach(function(attr){
                        if (isNaN(csvState[attr])) {
                            var val = csvState[attr];
                        } else {
                            var val = parseFloat(csvState[attr]);
                        } 
                        geojsonProps[attr] = val; 
                    });
                }
            }
        }
        return mState;
    };


    function drawStates(mState, map, path){

        centroids = mState.map(function (feature){
            return [feature.properties.geo_id, path.centroid(feature)];
        });
        
        areas = mState.map(function (feature){
            return [feature.properties.geo_id, path.area(feature)];
        });
        
        //add us regions to map
        var states = map.selectAll(".states")
            .data(mState)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.geo_id;
            })
            .attr("d", path)
            .style("fill", "#ddd")

        setEventListeners(true, true, false);
        
        var desc = states.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.25px"}');
    };

    
    function animateIntro(){
                    
        gameStatus = "Waiting"
        
        d3.select(".selector").style("visibility", "hidden").style("opacity", 0)
        d3.select(".map")
            .transition()
            .duration(1500)
            .ease(d3.easeCircleOut)
            .style("opacity", 1)
            .style("visibility", "visible")

        d3.select(".map").style("pointer-events", "none")
        var ratW = 14
        var ratH = 24
        var ratA = ratW/ratH

        function animateGuess(callback) {
            setTimeout(function(){

                var newW = Math.floor(Math.random() * 60)
                if (newW < 14) {ratW = 14} else {ratW = newW}
                ratH = Math.floor(ratW/ratA)

                var statexy = centroids[Math.floor(Math.random() * centroids.length)];
                var st = statexy[0,0]
                var xy = statexy[0,1]

                d3.select(".map")
                    .append("svg:image")
                    .attr("xlink:href", "img/guess.png")
                    .attr("class", "guess")
                    .attr("id", "guess_"+st)
                    .attr("x", xy[0])
                    .attr("y", xy[1])
                    .attr("width", ratW)
                    .attr("height", ratH);

                d3.select("#guess_"+st)
                    .transition()
                    .delay(function(){return ((Math.floor(Math.random() * 1500)));})
                    .duration(350)
                    .style("opacity", 1)
                        .transition()
                        .delay(1000)
                        .duration(250)
                        .style("opacity", 0)

                callback(null);
            },100);
        }

        var q = d3.queue(3);

        for (var j = 0; j < 60; ++j) {
          q.defer(animateGuess);
        }

        q.awaitAll(function(error) {
            if (error) throw error;
            setTimeout(function(){
                d3.select(".map").style("pointer-events", "auto")
                d3.select(".selector")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
                d3.select(".rule")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
                d3.select(".score")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
//                d3.select(".switchlabel")
//                    .transition()
//                    .duration(1500)
//                    .ease(d3.easeCircleOut)
//                    .style("opacity", 1)                
            }, 2000);
        })
        
        runIntro = false;
    }
        
    
    function resetStates(){
        
        if ($(".alert").is(":visible")) {
            $(".alert").dialog("close")                   
        }
        
        d3.select("#star")
            .remove()
        d3.selectAll(".guess")
            .remove()
        
        d3.selectAll(".states")
            .style("fill", "#ddd")
            .style("stroke", "#000")
            .style("stroke-width", "0.25px")

        if(runIntro && animate){
            animateIntro()
        } else {
            if(runIntro){
                d3.select(".map").style("pointer-events", "auto")
                d3.select(".selector")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
                d3.select(".rule")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
                d3.select(".score")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
                d3.select(".map")
                    .transition()
                    .duration(1500)
                    .ease(d3.easeCircleOut)
                    .style("opacity", 1)
                    .style("visibility", "visible")
            }
            runIntro = false;
        }
 
        gameStatus = "Playing"     
    };
    
    
    function createButtons(csvData){
        
        d3.select(".selector").remove();
        
        remainQsArray = [];
        
        for (var i=0; i<csvData.length; i++){
            var val = csvData[i]["question"];
            if (typeof val == 'string'){
                remainQsArray.push(val);
            } 
        }; 

        //add select element
        var selector = d3.select(".controls")
            .append("button")
            .attr("class", "selector")
            .attr("id", "question")
            .text("Click HERE to Start the Quiz!")
            .on("click", function(){
                updateButton();
            });
        
    };
    
    
    function updateButton(){
        
        resetStates()
        shuffle(remainQsArray)
        questionText = remainQsArray.pop()

        var scorR = remainQsArray.length - 1
        d3.select("#scorR").html(scorR)
        
        if(remainQsArray.length == 0){
            var scorR = remainQsArray.length
            d3.select(".selector")
                .text("That's all folks!  You've seen all the questions.")
                .style("font-family", "Patrick Hand")
            setEventListeners(false,false,false)
            d3.select(".selector").style("pointer-events", "none")
            gameOver();
        } else {
            var scorR = remainQsArray.length - 1
            d3.select(".selector")
                .text("Which state " + questionText + "?")
                .style("font-family", "Patrick Hand")
            setEventListeners(true,true,false) 
            loadAnswers()
        }  
        
        d3.select("#scorR").html(scorR)
    }

    
    function launchGame(props){

        gameStatus = "Running"
        
        setEventListeners(false, false, false);
        d3.select(".selector")
            .style("pointer-events", "none")
            .style("visibility", "hidden")
            .style("opacity", 0)

        d3.select("#scorA").html(++scorAi)
        
        for(var i = 0; i < centroids.length; i++) {
           if(centroids[i][0] == props.geo_id) {
               var mp = centroids[i][1].slice();
           }
        }
        
        var xy = shiftCentroid(props.geo_abbrv, mp);
        
        for(var i = 0; i < areas.length; i++) {
           if(areas[i][0] == props.geo_id) {
               var ar = areas[i][1];
           }
        }
        
        var maxArea = Math.max.apply(Math, areas.map(function (i) {return i[1]}));
        var starSize = 800 * (ar/maxArea)
        if(starSize<100){starSize=100}
        
        d3.select(".map")
            .append("path")
            .attr("id", "star")
            .attr("d", d3.symbol().type(d3.symbolStar).size(starSize))
            .attr("transform", "translate("+xy[0]+","+xy[1]+")")
            .style("fill", "black")
            .style("stroke", "black")
            .style("stroke-width", "1")
        
        selectedStateName = props.geo_name;
        selectedStateID = props.geo_id;
        
        correctStateID = answerData[0]["geo_id"]
        correctStateName = answerData[0]["geo_name"]

        if (selectedStateID == correctStateID) {playerResults = 0} else {playerResults = 1} 
        
        if (animate) {
            runAnimation(xy) 
            setTimeout(showResults, 4000, props)
        } else {
            var colorScale = quantileColorScale(answerData)
            colorStates(colorScale, 100)
            showResults(props)
            setEventListeners(true,false,false)
        }
        

    };
    
    
    function loadAnswers(){

        for (var i=0; i<questionData.length; i++){

            if (questionData[i]["question"] == questionText){

                questionID = questionData[i]["q_id"]
                answerState = questionData[i]["answer_state"]
                answerText = questionData[i]["answer_text"]
                qCat = questionData[i]["category"]

            }
        };

        expressed = questionID+"norm";
        displayed = questionID+"raw";

        answerData.sort(function(a, b){return d3.descending(parseFloat(a[expressed]), parseFloat(b[expressed]));})
    }
    
    
    function runAnimation(xy){

        var colorScale = quantileColorScale(answerData);
        
        var arrStates = [];
        for (var i=0; i<answerData.length; i++){
            var val = answerData[i]["geo_id"];
            if (typeof val == 'string'){
                arrStates.push(val);
            } 
        };
        
//        var colorClasses = ['#f7fcfd',                           
//                            '#e0ecf4',
//                            '#bfd3e6',
//                            '#9ebcda',
//                            '#8c96c6',
//                            '#8c6bb1',
//                            '#88419d',
//                            '#6e016b',
//                            '#e5f5f9',
//                            '#ccece6',
//                            '#99d8c9',
//                            '#66c2a4',
//                            '#41ae76',
//                            '#238b45',
//                            '#005824',
//                            '#fff7ec',
//                            '#fee8c8',
//                            '#fdd49e',
//                            '#fdbb84',
//                            '#fc8d59',
//                            '#ef6548',
//                            '#d7301f',
//                            '#990000',
//                            '#fcfbfd',
//                            '#efedf5',
//                            '#dadaeb',
//                            '#bcbddc',
//                            '#9e9ac8',
//                            '#807dba',
//                            '#6a51a3',
//                            '#4a1486',
//                            '#f7f4f9',
//                            '#e7e1ef',
//                            '#d4b9da',
//                            '#c994c7',
//                            '#df65b0',
//                            '#e7298a',
//                            '#ce1256',
//                            '#91003f'];
     
        function animateStates(callback) {
            setTimeout(function(){

                var randomState = arrStates[Math.floor(Math.random() * arrStates.length)];
                var randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
               
                if(randomState !== selectedStateID){
                    d3.select("."+randomState)
                        .transition()
                        .duration(500)
                        .style("fill", randomColor);
                    d3.select("."+randomState)
                        .transition()
                        .delay(500)
                        .duration(500)
                        .style("fill", "#ddd");
                };
                callback(null);
            },25);
        }

        var q = d3.queue(4);

        for (var j = 0; j < 128; ++j) {
          q.defer(animateStates);
        }

        q.awaitAll(function(error) {
            if (error) throw error;
            colorStates(colorScale, 1000);
        });
    };
    
    
    function colorStates(colorScale, td){
        
        
        d3.selectAll(".states")
            .transition()
            .delay(td)
            .duration(td)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

        d3.select("."+correctStateID)
            .transition()
            .delay(td*2)
            .duration(td)
//            .style("fill", "green")
            .style("stroke", "gold")
            .style("stroke-width", "5")
        if(selectedStateID == correctStateID){
            d3.select("#star")
                .transition()
                .delay(td*2.5)
                .duration(td*0.5)
                .style("fill", "gold")
        } else {
            d3.select("#star")
                .transition()
                .delay(td*2.5)
                .duration(td*0.5)
                .style("fill", "red")
                .style("opacity", 0.5)
        }         
    }
    
    
    function showResults(props){

        reactText = reactArray[playerResults][(Math.floor(Math.random() * 5))]
        if (playerResults == 0) {var reactColor = "#00c73f"} else {var reactColor = "#c70000"}
        var infoDesc1 = correctStateName + " " + questionText + "!";
        var infoDesc2 = answerText;
        
        //label content
        var infoAttribute1 = '<span id="res">' + infoDesc1 + '</span>';
        var infoAttribute2 = '<span id="res2">' + infoDesc2 + '</span>';
        var playerAttribute = '<h2>' + reactText + '</h2>';
        
        //create info label div
        var bannerResults = d3.select("header")
            .append("div")
            .attr("class", "resultsbox")
            .style("background-color", reactColor)
            .on("click", function(){
//                  if(runTutorial){d3.select(".selector").html('Which state ' + questionText + '? &emsp; <span id="nextQ">(Click for next question)</span>')}
                    setEventListeners(true,false,true)    
                    this.remove();
                })
            .html(playerAttribute)
    
        d3.select(".resultsbox")
            .append("div")
            .attr("class", "resultsgoo")
            .html(infoAttribute1)
                  
        d3.select(".resultsbox")
            .append("div")
            .attr("class", "resultsgoo")
            .html(infoAttribute2);
        
//        if(runTutorial){
//            d3.select(".resultsbox")
//                .append("div")
//                .attr("class", "instruct")
//                .style("left", window.innerWidth - 250+"px")
//                .text("Click Banner to Keep Playing");
//        }
        
        d3.select(".resultsbox")
            .transition()
                .delay(500)
                .duration(1000)
                .style("visibility", "visible")
                .style("opacity", 1)
    
        gameStatus = "Finished"

        d3.select(".selector").style("pointer-events", "auto").text("Click HERE for the Next Question!")
        
        d3.select(".selector")
            .transition()
                .delay(500)
                .duration(1000)
                .style("visibility", "visible")
                .style("opacity", 1)
        
        if (playerResults == 0) {
            d3.select("#scorC").html(++scorCi)
        } else {
            d3.select("#scorC").html(scorCi)
        }
        
        scorSi = ((scorCi / scorAi) * 100).toFixed(0)+"%"
        d3.select("#scorS").html(scorSi)
        
        setEventListeners(true,false,false)
//        if(scorAi>4){runTutorial=false;}
    }
    
    
    function gameOver(){
        
        questionText = "NULL";
        
        //label content
        var infoAttribute1 = '<h2 id="gos">Thank you for playing!</h2>';
        var infoAttribute2 = '<h2 id="gos2">Hopefully you enjoyed learning more about the geography of the "Lower 48" states.</h2>';
        var playerAttribute = '<h2>GAME OVER</h2>';
        
        //create info label div
        var bannerGameOver = d3.select(".grid")
            .append("div")
            .attr("class", "gameoverbox")
            .style("background-color", "blue")
            .on("click", function(){
                    createButtons(questionData)
                    resetStates()
                    setEventListeners(false,false,false)
                    d3.select(".selector").style("pointer-events", "auto")
                    buildScoreBox()
                    this.remove();
                })
            .html(playerAttribute)
    
        d3.select(".gameoverbox")
            .append("div")
            .attr("class", "gameovergoo")
            .html(infoAttribute1)
                  
        d3.select(".gameoverbox")
            .append("div")
            .attr("class", "gameovergoo")
            .html(infoAttribute2);
        
        d3.select(".gameoverbox")
            .transition()
                .duration(1000)
                .style("visibility", "visible")
                .style("opacity", 1)
    
        gameStatus = "Over"
    }
    
    
    //function to create color scale generator
    function quantileColorScale(data){
        
        switch(qCat) {
            case "demo":
                colorClasses = ['#efedf5','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#4a1486'];  //purples//
                break;
            case "phys":
                colorClasses = ['#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#084594'];  //blues//
                break;
            case "nat":
                colorClasses = ['#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#99000d'];  //reds//
                break;
            case "econ":
                colorClasses = ['#e5f5e0','#c7e9c0','#a1d99b','#74c476','#41ab5d','#238b45','#005a32'];  //greens//
                break;
            default:
                colorClasses = ['#fee6ce','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#8c2d04'];  //oranges//
        }

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            if (typeof val == 'number' && val != 0){
                domainArray.push(val);
            } 
        };

        colorScale.domain(domainArray);

        return colorScale;
    };
    

    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);

        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && val != 0){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };
    
            
    //function to highlight enumeration units and bars
    function highlight(props){
        switch(gameStatus) {
            case "Playing":
                var selected = d3.selectAll("." + props.geo_id)
                    .style("stroke", "blue")
                    .style("stroke-width", "3");
                
                if(animate){
                    for(var i = 0; i < centroids.length; i++) {
                       if(centroids[i][0] == props.geo_id) {
                           var xy = centroids[i][1].slice();
                           if (props.geo_acres/640 < 30000) {
                               var factor = -0.5
                               var scale = 1.5
                           } else {
                               var factor = -0.25
                               var scale = 1.25
                           }  
                       }
                    }

                    var tx = factor * xy[0]
                    var ty = factor * xy[1]

                    d3.select(".states."+props.geo_id)
                        .transition()
                        .duration(300)
                        .attr("transform", "translate("+tx+","+ty+")scale("+scale+")rotate(0)")                    
                }
                setInfoSelect(props);
                break;
                
            case "Finished":
                setInfoResult(props);
                break;
        }
    };
    
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        
        d3.select(".infolabel")
            .remove();

        if (gameStatus !== "Finished") {
            if(animate){
                d3.select(".states."+props.geo_id)     
                    .transition()
                    .duration(300)
                    .attr("transform", "translate(0,0)scale(1)rotate(0)");                
            }
            var selected = d3.selectAll("." + props.geo_id)
                .style("stroke", function(){
                    return getStyle(this, "stroke")
                })
                .style("stroke-width", function(){
                    return getStyle(this, "stroke-width")
                });
        }

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    };
        

    function setBoxPos(props){
        
        var infoR = d3.select(".states."+props.geo_id)
            .node()
            .getBoundingClientRect()
            .right;
        
        var infoL = d3.select(".states."+props.geo_id)
            .node()
            .getBoundingClientRect()
            .left;
        
        var infoB = d3.select(".states."+props.geo_id)
            .node()
            .getBoundingClientRect()
            .bottom;

        var infoW = d3.select(".states."+props.geo_id)
            .node()
            .getBoundingClientRect()
            .width;
        
        var infoH = d3.select(".states."+props.geo_id)
            .node()
            .getBoundingClientRect()
            .height;  
        
        if (infoL > 720){
            var posS = "right"
            var posX = window.innerWidth - infoL
        } else {
            var posS = "left"
            var posX = infoR
        }
        
        var posY = infoB
        
        switch(props.geo_abbrv) {
            case "TX":
                posY = posY - (infoH / 3);
                break;
            case "MI":
                posX = posX - (infoW / 3);
                posY = posY - (infoH / 3);
                break;
            case "FL":
                posX = posX - (infoW / 2);
                posY = posY - (infoH / 2);
                break;
            case "NV":
                posX = posX - (infoW / 5);
                break;
            case "WI":
                posX = posX - (infoW / 5);
                posY = posY - (infoH / 3);
                break;
            case "IL":
                posX = posX - (infoW / 5);
                posY = posY - (infoH / 3);
                break;
            case "SC":
                posX = posX - (infoW / 4);
                posY = posY - (infoH / 4);
                break;
            case "MD":
                posX = posX - (infoW / 4);                
                break;
            case "RI":
                posX = posX + (infoW);
                posY = posY + (infoH * 1.25);
                break;
        }
        
        return [posX, posY, posS];
    };
    
    
    //function to create dynamic label
    function setInfoSelect(props){
        
//        if(runTutorial){
//            var stateName = "Click to Select " + props.geo_name.toUpperCase() + " as the Answer"            
//        }else{
            var stateName = "Is it " + props.geo_name.toUpperCase() + " ?"            
//        }

        var infoAttribute1 = "Population: " + comma(props.geo_pop) 
        var infoAttribute2 = "Land Area: " + comma(Math.floor(props.geo_acres/640)) + " sq miles"

        var posArr = setBoxPos(props);
        var posX = posArr[0];
        var posY = posArr[1];
        var posS = posArr[2];
        
        //create info label div
        var infolabel = d3.select(".hoover")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.geo_id + "_label")
            .style(posS, posX + "px")
            .style("top", posY + "px");
        
        infolabel.append("div")
            .attr("class", "infohead")
            .html(stateName);
        infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute1);
        infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute2);
    };

    
    function setInfoResult(props){
        
        function nth(n){return["st","nd","rd"][((n+90)%100-10)%10-1]||"th"};

        var idxRank = answerData.findIndex(function (i) {return i.geo_id === props.geo_id})+1
        var ordRank = idxRank + nth(idxRank)
       
        var showRaw = comma(Math.round((props[displayed] + Number.EPSILON) * 100) / 100)
        
        if (props[displayed] == 0) {
            var stateName = props.geo_name.toUpperCase() + " is not ranked on this question."
        } else {
            var stateName = props.geo_name.toUpperCase() + " is ranked " + ordRank + " on this question!"
        } 
        
        switch(questionID) {
            case "q04":
                var showNorm = comma(Math.round(((props[expressed] + Number.EPSILON) * 100) / 100))
                break;
            case "q06":
                var showNorm = comma(Math.round((((props.geo_pop/props.q06raw) + Number.EPSILON) * 100) / 100))
                break;
            case "q13":
                var workRaw = props[displayed]/124
                if (workRaw < 1) {
                    showRaw = comma(Math.round((workRaw*1000 + Number.EPSILON) * 100) / 100) + " thousand "
                } else {
                    showRaw = comma(Math.round((workRaw + Number.EPSILON) * 100) / 100) + " million "
                }
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                break;
            case "q14":
                var showNorm = comma(Math.round(((props[expressed] + Number.EPSILON) * 100) / 100))
                break;
            case "q16":
                var showNorm = comma(Math.round(((props[expressed] + Number.EPSILON) * 100) / 100))
                if (props[displayed] == 0) {
                    showRaw = "very few"
                    showNorm = "a neglible"
                } else {
                    showRaw = showRaw + " million"
                }             
                break;
            case "q17":
                var showNorm = comma(Math.round((((props.geo_pop/props.q17raw) + Number.EPSILON) * 100) / 100))
                break;
            case "q20":
            case "q21":
            case "q22":
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                if (props[displayed] == 0) {
                    showRaw = "no"
                    showNorm = "- of course - 0"
                } else {
                    showRaw = showRaw + " acres of"
                }             
                break;    
            case "q24":
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                if (props[displayed] == 0) {
                    showRaw = "no known true caves"
                    showNorm = "an unknown, but likely neglible,"
                } else {
                    showRaw = showRaw + " miles of caves"
                }             
                break;
            case "q25":
                var workNorm = props[displayed] * (props[expressed] - 1)
                if (workNorm < 0) {
                    var modSw = "less"
                } else {
                    var modSw = "more"
                }
                workNorm = (Math.round((Math.abs(workNorm) + Number.EPSILON) * 100) / 100)
                if (workNorm < 1) {
                    workNorm = (Math.round((((workNorm * 60) + Number.EPSILON) * 100) / 100))
                    var showNorm = workNorm + " seconds " + modSw
                } else {
                    var showNorm = workNorm + " minutes " + modSw
                }              
                break;
            case "q27":
                var showNorm = comma(Math.round(((1/props[expressed]) + Number.EPSILON) * 100) / 100)
                break;  
            case "q31":
                var showNorm = comma(Math.round((((1/props[expressed]) + Number.EPSILON) * 100) / 100))
                break;  
            case "q34":
            case "q35":
                if (props[expressed] < 0) {
                    var modSw = "less"
                } else {
                    var modSw = "more"
                }
                var workNorm = (Math.round((Math.abs(props[expressed]) + Number.EPSILON) * 100) / 100)
                var showNorm = workNorm + " % " + modSw + " than "        
                break;
            case "q38":
                var showRaw = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                var showNorm = props[displayed]
                break;
            case "q40":
                var showNorm = comma(Math.round((((props.geo_pop/props.q40raw) + Number.EPSILON) * 100) / 100))
                break;
            case "q44":
                if (props[expressed] < 0) {
                    var modSw = "above "
                } else {
                    var modSw = "below "
                }
                var workNorm = (Math.round((Math.abs(props[expressed]) + Number.EPSILON) * 100) / 100)
                var showNorm = workNorm + " degrees " + modSw 
                showRaw = showRaw + " &deg" + "F"
                break;
            case "q45":
                if (props[expressed] < 0) {
                    var modSw = "below "
                } else {
                    var modSw = "above "
                }
                var workNorm = (Math.round((Math.abs(props[expressed]) + Number.EPSILON) * 100) / 100)
                var showNorm = workNorm + " degrees " + modSw 
                showRaw = showRaw + " &deg" + "F"
                break;
            case "q51":
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                if (props[displayed] == 0) {
                    showRaw = "is no"
                    showNorm = "- of course - 0"
                } else {
                    showRaw = "are " + showRaw + " miles of"
                }             
                break; 
            case "q58":
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                if (props[displayed] == 0) {
                    showRaw = "is no"
                    showNorm = "- of course - 0"
                } else {
                    showRaw = "are " + showRaw + " acres of"
                }             
                break; 
            case "q60":
                if (props[expressed] < 0) {
                    var modSw = "less"
                } else {
                    var modSw = "more"
                }
                var workNorm = (Math.round((Math.abs(props[expressed]) + Number.EPSILON) * 100) / 100)
                var showNorm = workNorm + " MPH " + modSw + " than "        
                break;
            case "q65":
                var showRaw = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
                var showNorm = props[displayed]
                break;
            default:
                var showNorm = comma(Math.round((props[expressed] + Number.EPSILON) * 100) / 100)
        }

        var idxLoad = questionData.findIndex(function (i) {return i.q_id === questionID})
        var infoAttribute1 = questionData[idxLoad].raw_prefix + " " + showRaw + " " + questionData[idxLoad].raw_suffix
        var infoAttribute2 = questionData[idxLoad].norm_prefix + " " + showNorm + " " + questionData[idxLoad].norm_suffix
        
        var posArr = setBoxPos(props);
        var posX = posArr[0];
        var posY = posArr[1];
        var posS = posArr[2];
        
        //create info label div
        var infolabel = d3.select(".hoover")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.geo_id + "_label")
            .style(posS, posX + "px")
            .style("top", posY + "px");
        
        infolabel.append("div")
            .attr("class", "infohead")
            .html(stateName);
        infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute1);
        infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute2);
    
    };   

        
    function warnSelect() {

        $('#mess').text("Use the button above to select a question, then click on the state that you think is the correct answer!")
        
        $('.alert').dialog({
            title: "Please Select a Question",
            resizable: false,
            modal: false,
            show: { effect: "explode", duration: 500 },
            hide: { effect: "explode", duration: 500 }
        });
    }
    
        
    function setEventListeners(m,c,s){
        if(m){
            d3.selectAll(".states")
                .on("mouseenter", function(d){
                    if (gameStatus == "Playing") {
                        this.parentElement.appendChild(this);                        
                    }
                    highlight(d.properties);
                })
                .on("mouseleave", function(d){
                    dehighlight(d.properties);
                })
                .on("mousemove", null);
        } else {
            d3.selectAll(".states")
                .on("mouseenter", null)
                .on("mouseleave", null)
                .on("mousemove", null);
        }
        
        if(c){
            d3.selectAll(".states")
                .on("click", function(d){
                    if (questionText == "NULL") {
                        warnSelect();
                    } else {
                        dehighlight(d.properties);
                        launchGame(d.properties);
                    }
                })
        } else {
            d3.selectAll(".states")
                .on("click", null)
        }  
        
        if (s) {
            var trans = d3.select("#star").attr("transform")
            d3.selectAll("#star")
                .on("mouseover", function(d){spinStar(trans)})
        } else {
            d3.selectAll("#star")
                .on("mouseover", null)            
        }
    }

    
    function shiftCentroid(st,mp){
        switch(st) {
            case "CA":
                mp[0] = mp[0]-5
                mp[1] = mp[1]+5
                return mp;
                break;
            case "FL":
                mp[0] = mp[0]+15
                return mp;
                break;
            case "LA":
                mp[0] = mp[0]-10
                return mp;
                break;
            case "MA":
                mp[1] = mp[1]-3
                return mp;
                break;
            case "MD":
                mp[0] = mp[0]+5
                mp[1] = mp[1]-3
                return mp;
                break;
            case "MI":
                mp[0] = mp[0]+10
                mp[1] = mp[1]+15
                return mp;
                break;
            case "NJ":
                mp[0] = mp[0]+5
                return mp;
                break;
            default:
                return mp;
        }
    }
    
    
    function spinStar(trans){
        d3.select("#star")
            .transition()
            .duration(300)
            .attr("transform", trans+"scale(2.5)rotate(120)")
            .transition()
            .delay(310)
            .duration(300)
            .attr("transform", trans+"scale(1)rotate(-120)");        
    }

    

    var shuffle = function (array) {

        var currentIndex = array.length;
        var temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;

    };
    
})(); //last line of main.js
