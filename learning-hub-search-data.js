/* Canonical Learning Hub search/nav index — one entry per real route,
   relative to the learning.swayform.net root.
   Keep in sync with the sidebar markup on each Learning Hub page. */
var LH_INDEX = [
  {url:'/',                                   title:'Learning Hub Home',                 group:'Start Here', status:'ready', keywords:['home','overview','start','welcome','dashboard']},
  {url:'/getting-started',                    title:'Getting Started',                   group:'Start Here', status:'ready', keywords:['orientation','what swayform teaches','how students use this hub','file structure','intro']},
  {url:'/classroom-workflow',                 title:'Classroom Workflow',                 group:'Start Here', status:'ready', keywords:['workflow','queue','approval','instructor review','submission']},
  {url:'/safety',                             title:'Safety Notes',                       group:'Start Here', status:'ready', keywords:['safety','pinch','stop','checklist']},
  {url:'/setup',                              title:'Setup: VS Code, Running & Stopping', group:'Setup',       status:'ready', keywords:['vscode','remote','ide','setup','run','stop','ctrl c']},
  {url:'/ssh',                                title:'SSH & Student Accounts',             group:'Setup',       status:'ready', keywords:['ssh','shared account','login','connect','network']},
  {url:'/projects',                           title:'Student Projects',                   group:'Setup',       status:'ready', keywords:['project','package','folder','create-project','password']},
  {url:'/queue',                              title:'Validation & Queue',                 group:'Setup',       status:'ready', keywords:['queue','validation','build check','submission','approve']},
  {url:'/demos',                              title:'Demo Code Library',                  group:'Demo Code Library', status:'ready', keywords:['demo','library','overview','all demos']},
  {url:'/demos/wave',                         title:'Demo: Wave',                         group:'Demo Code Library', status:'ready', keywords:['wave','arm','motion','hello','gesture','beginner']},
  {url:'/demos/handshake',                    title:'Demo: Handshake',                    group:'Demo Code Library', status:'ready', keywords:['handshake','vision','realsense','camera','detection']},
  {url:'/demos/pick-and-place',               title:'Demo: Pick and Place',                group:'Demo Code Library', status:'ready', keywords:['pick','place','grasp','arm','object','manipulation']},
  {url:'/demos/rock-paper-scissors',          title:'Demo: Rock Paper Scissors',           group:'Demo Code Library', status:'ready', keywords:['rock paper scissors','game','random','hand pose','loop']},
  {url:'/demos/interactive-exchange',         title:'Demo: Interactive Exchange',          group:'Demo Code Library', status:'ready', keywords:['exchange','dollar','bill','snack','token','state machine']},
  {url:'/labs',                               title:'Student Labs',                       group:'Student Labs', status:'ready', keywords:['labs','overview','student','list','all labs','lab 01','lab 02']},
  {url:'/repair',                             title:'Repair',                             group:'Reference', status:'ready', keywords:['repair','replace','disassembly','calibration','3d print','part']},
  {url:'/technical-reference',                title:'Technical Reference',                group:'Reference', status:'ready', keywords:['ros2','servo mapping','pca9685','power','audio','motion node','realsense','channel']},
  {url:'/troubleshooting',                    title:'Troubleshooting',                    group:'Reference', status:'ready', keywords:['troubleshoot','error','fix','problem','help','debug','not working']},
  {url:'/glossary',                           title:'Glossary',                           group:'Reference', status:'ready', keywords:['glossary','terms','definitions','vocabulary','what is']}
];
