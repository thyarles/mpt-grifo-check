var saldo_jornada_mes_at = 0;
var saldo_current = 0;
var idx_hoje = 0;
var arr_f_nome = $('#cabecalho > div > table:eq(0) > tbody > tr:eq(1) > td:eq(0)').text().trim().split(',');
var str_nome = arr_f_nome[1].toUpperCase();
var cct_nome = arr_f_nome[1].trim().replaceAll(' ','');
var id_cookie_periodo = cct_nome+'-grifo_saldo-'+$('input[name=data]').val();
var id_cookie_config = cct_nome+'-grifo_saldo';
var total_dias = $('table.tabela:eq(1) > tbody > tr').length;

var hor_min = '08:30';
var hor_max = '20:30';

var getDadosMesOrig = function() {

  var cnt = 1;
  var arr_jornadas_orig = [];
  var arr_horarios_orig = [];

  var date_t = new Date();
  var str_hoje = formatDate(date_t,'dd/MM/yy');

  $('.conteinerSaldo,.conteinerJornada').remove(); 
  $('table.tabela:eq(1) > tbody > tr').each(function(){

    //JORNADAS    
    //$(this).find('td:eq(1) img').remove();
    arr_jornadas_orig.push(getJornadaDiaOrig($(this)));
    $(this).find('td:eq(1)').append('<br class="conteinerJornada"><span class="conteinerJornada" id="conteinerjornada'+cnt+'"></span>');
    
    //HORARIOS    
    //$(this).find('td:eq(2) img').remove();       
    arr_horarios_orig.push(getHorariosDiaOrig($(this)));
    $(this).find('td:eq(2)').append('<br class="conteinerSaldo"><span class="conteinerSaldo" id="conteinerdia'+cnt+'"></span>');

    //CHECA INDEX DA DATA DE HOJE
    var arr_data = $(this).find('td:eq(0)').text().trim().split(' '); 
    if(arr_data[0] == str_hoje) idx_hoje = cnt;

    cnt++;

  });   
  
  return {'arr_jornadas_orig':arr_jornadas_orig,'arr_horarios_orig':arr_horarios_orig};

}

var getJornadaDiaOrig = function(obj_linha) {

  var pattern_h = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  var jornada_dia = '00:00';
  
  if($(obj_linha).find('td:eq(1)').text().trim()){

    var content = $(obj_linha).find('td:eq(1)').clone();
    $(content).find('img').remove();
    var jor_str_html = $(content).html().replaceAll('<br>','#');    
    //var jor_str_html = $(obj_linha).find('td:eq(1)').html().replaceAll('<br>','#');    

    var arr_str_jor = jor_str_html.trim().split('#');
    var arr_dia_jornada = [];
    var saldo_horario_dia_jornada = 0;

    for(var i=0;i<arr_str_jor.length;i++) {
      arr_dia_jornada[i] = arr_str_jor[i].split(' - ');        
    }    

    for(var x=0;x<arr_dia_jornada.length;x++) {
      var arr = [];
      for(var w=0;w<arr_dia_jornada[x].length;w++) {                              
        arr[w] = arr_dia_jornada[x][w].trim().replaceAll('&nbsp;','');              
      }
      arr_dia_jornada[x] = arr;

      //GUARDA JORNADA
      var carga_jornada = pattern_h.test(arr[0]) && pattern_h.test(arr[1]) ? diffDate(arr[0],arr[1]) : 0;                
      saldo_horario_dia_jornada += carga_jornada;

    }    

    jornada_dia = formatMsec(saldo_horario_dia_jornada);    

  }

  return jornada_dia;

}

var getHorariosDiaOrig = function(obj_linha) {
    
  var arr_dia_horarios = [];

  if($(obj_linha).find('td:eq(2)').text().trim()){

    var content = $(obj_linha).find('td:eq(2)').clone();
    $(content).find('img').remove();
    var hor_str_html = $(content).html().replaceAll('<br>','#'); 
    //var hor_str_html = $(obj_linha).find('td:eq(2)').html().replaceAll('<br>','#');       
   
    var arr_str_pontos = hor_str_html.trim().split('#');
    //console.log(arr_str_pontos);                 
    for(var i=0;i<arr_str_pontos.length;i++) {      
      //delete arr_dia_horarios;         
      arr_dia_horarios[i] = arr_str_pontos[i].split(' - ');        
    }    
    //console.log(arr_str_pontos);            
    //console.log(arr_dia_horarios);            
    //console.log(arr_str_pontos[0].split(' - '));
    

    for(var x=0;x<arr_dia_horarios.length;x++) {
      var arr = [];
      for(var w=0;w<arr_dia_horarios[x].length;w++) {                              
        arr[w] = arr_dia_horarios[x][w].trim();              
      }
      arr_dia_horarios[x] = arr;
    }
  
  }  

  return arr_dia_horarios;

}



var setCkInputValues = function() {

  if($('.minhaJornada').length && $('.meuPonto').length) {
  
    var arr_jornadas_input = [];
    var arr_horarios_input = [];
    
    for(var i=0;i<total_dias;i++) {
      
      var n=0;
      var z=0;
      var arr_dia_horarios_inpt = [];
      var bckp_val = '';

      //VARRE HORARIOS
      if($('.meuPonto').length) {
        
        $('.meuPonto.dia'+(i+1)).each(function() {

          var input_val = $(this).val();

          //if(input_val) {
        
            if((n%2)==0) {
              bckp_val = input_val;                 
            }
            else {                           
              arr_dia_horarios_inpt[z] = [bckp_val,input_val];
              z++;
            }
            n++;

          //}

        });

        arr_horarios_input.push(arr_dia_horarios_inpt);

      }

      //VARRE JORNADAS
      $('.minhaJornada.dia'+(i+1)).each(function() {        
        arr_jornadas_input.push($(this).val());
      });
      
    }

    /*//DEFINE INTERVALO
    if($('#horMin').length && $('#horMax').length) {

      hor_min = $('#horMin').val()==hor_min ? hor_min : $('#horMin').val();
      hor_max = $('#horMax').val()==hor_max ? hor_max : $('#horMax').val();
      hor_max = diffDate('00:00',hor_max)<=diffDate('00:00',hor_min) ? formatMsec(diffDate('00:00',hor_min)+3600000) : hor_max;

    }*/

    //ARMAZENA COOKIE
    setObjJornadasHorariosCookie({'arr_jornadas_ck':arr_jornadas_input,'arr_horarios_ck':arr_horarios_input/*,'hor_min':hor_min,'hor_max':hor_max*/});    
  }



  //return {'arr_jornadas_input':arr_jornadas_input,'arr_horarios_input':arr_horarios_input};
  return;

}

var getArrResultCk = function(/*arr_jornadas_grv,arr_horarios_grv*/) {

  //Cookies.remove(id_cookie_periodo);

  var arr_dados_orig = getDadosMesOrig();    
  var arr_jornadas_orig = arr_dados_orig['arr_jornadas_orig'];
  var arr_horarios_orig = arr_dados_orig['arr_horarios_orig'];  

  //var arr_jornadas_grv = arr_jornadas_grv || [];
  //var arr_horarios_grv = arr_horarios_grv || [];

  var arr_cookie = Object.keys(getArrJornadasHorariosCookie()).length ? getArrJornadasHorariosCookie() : {};  
  var arr_jornadas_ck = arr_cookie['arr_jornadas_ck'] || [];
  var arr_horarios_ck = arr_cookie['arr_horarios_ck'] || [];  
  
  var arr_jornadas_result = [];
  var arr_horarios_result = [];
  
  //INTERVALO
  var arr_cookie_config = Object.keys(getConfigCookie()).length ? getConfigCookie() : {};     
  hor_min = arr_cookie_config['hor_min'] || hor_min;
  hor_max = arr_cookie_config['hor_max'] || hor_max;  
  
  $('#horMin').val(hor_min);
  $('#horMax').val(hor_max);

  //JORNADAS
  for(var dia in arr_jornadas_orig) {
    
    arr_jornadas_result[dia] = arr_jornadas_ck[dia] /*|| arr_jornadas_grv[dia]*/ || arr_jornadas_orig[dia];    

  }

  //HORÁRIOS  
  for(var dia=0;dia<total_dias;dia++) {

    var lngt_array = Math.max((arr_horarios_ck[dia] ? arr_horarios_ck[dia].length : 0),(arr_horarios_orig[dia] ? arr_horarios_orig[dia].length : 0));
    
    arr_horarios_result[dia] = [];

    if(lngt_array) {
    
      for(var batida=0;batida<lngt_array;batida++) {

        arr_horarios_result[dia][batida] = [];
      
        var b1 = arr_horarios_ck[dia] && arr_horarios_ck[dia][batida] && arr_horarios_ck[dia][batida][0] ? arr_horarios_ck[dia][batida][0] : (arr_horarios_orig[dia] && arr_horarios_orig[dia][batida] && arr_horarios_orig[dia][batida] ? arr_horarios_orig[dia][batida][0] : '');
        var b2 = arr_horarios_ck[dia] && arr_horarios_ck[dia][batida] && arr_horarios_ck[dia][batida][1] ? arr_horarios_ck[dia][batida][1] : (arr_horarios_orig[dia] && arr_horarios_orig[dia][batida] && arr_horarios_orig[dia][batida] ? arr_horarios_orig[dia][batida][1] : '');

        arr_horarios_result[dia][batida][0] = b1;
        arr_horarios_result[dia][batida][1] = b2;

      }
    }
    else {
      arr_horarios_result[dia][0] = arr_horarios_orig[dia][0] = ['',''];
    }
    

    /*var arr_grv = arr_horarios_ck[i] && arr_horarios_ck[i].length ? arr_horarios_ck[i] : (arr_horarios_orig[i] ? arr_horarios_orig[i] : []);

    console.log(arr_grv.length);
    
    arr_horarios_result[i] = arr_grv;
    
    if(arr_grv.length) {

      for(var batida in arr_grv) {

        arr_horarios_result[i][batida][0] = arr_grv[batida][0];
        arr_horarios_result[i][batida][1] = arr_grv[batida][1];

      }
    }
    else {
      arr_horarios_result[i][0] = arr_horarios_orig[i][0] = ['',''];
    }*/

  }



  return {'arr_jornadas':arr_jornadas_result,'arr_horarios':arr_horarios_result,'arr_jornadas_orig':arr_jornadas_orig,'arr_horarios_orig':arr_horarios_orig};

}

var setInputJornadas = function(arr_jornadas,arr_jornadas_orig,arr_horarios) {
  
  var pattern_h = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  var saldo_jornada_mes_at = saldo_jornada_acum_hj = 0;
  var cnt_dia = 1; 
  var cnt_hoje = 0;
  
  //REMOVE INPUTS
  $('.minhaJornada').remove();

  for(var dia in arr_jornadas) {
      
    var html_j = '';        
    var j_dia = pattern_h.test(arr_jornadas[dia]) ? arr_jornadas[dia] : '00:00';

    var j_dia_orig = pattern_h.test(arr_jornadas_orig[dia]) ? arr_jornadas_orig[dia] : '00:00';
    var css_d_dia_color_change = j_dia != j_dia_orig ? 'background-color:#FF0' : 'background-color:#FFF';

    //GUARDA CARGA JORNADA DE HOJE SOMENTE SE TIVER PREENCHIDO
    var b_hj_chk = true;    
    if(idx_hoje==cnt_dia) cnt_hoje++;        
    if(cnt_hoje) {
      for(var batida in arr_horarios[dia]) {      
        var b1 = arr_horarios[dia][batida][0];
        var b2 = arr_horarios[dia][batida][1];
        b_hj_chk = b_hj_chk && pattern_h.test(b1) && pattern_h.test(b2) ? true : false;
      }
    }
    //CALCULO DE JORNADA
    var carga_jornada = diffDate('00:00',j_dia);      
    saldo_jornada_mes_at += carga_jornada;
    saldo_jornada_acum_hj += b_hj_chk ? carga_jornada : 0;;

    html_j += '<input size="5" style="'+css_d_dia_color_change+'" class="minhaJornada dia'+cnt_dia+'" id="minhaJornada'+cnt_dia+'" value="'+(j_dia || '')+'" val-orig="'+(j_dia_orig || '')+'">';      
    html_j += '<br class="minhaJornada">';

    $('#conteinerjornada'+cnt_dia).append(html_j);
    cnt_dia++;

  }


  return {'saldo_jornada_mes_at':saldo_jornada_mes_at,'saldo_current':saldo_current};

}

var setInputHorarios = function(arr_jornadas,arr_horarios,arr_horarios_orig) {

  //console.log(arr_horarios.length);

  var cnt_dia = 1;
  var saldo_horario_mes = 0;
  var pattern_h = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;    
  var cnt_erro = 0;
  var cnt_hoje = 0;

  $('.meuPonto,.meuSaldo').remove();
  
  for(var dia in arr_horarios) {
    
    var jornada_dia = diffDate('00:00',arr_jornadas[dia]);

    var saldo_horario_dia = 0;
    var html = '';
    var css_saldo = '';
    var cnt_batida = 1;

    if(idx_hoje==cnt_dia) cnt_hoje++;
    
    for(var batida in arr_horarios[dia]) {

      var b1 = arr_horarios[dia][batida][0];
      var b2 = arr_horarios[dia][batida][1];

      b1 = diffDate('00:00',b1)<diffDate('00:00',hor_min) && batida == 0 ? hor_min : b1;
      b2 = diffDate('00:00',b2)>diffDate('00:00',hor_max) && arr_horarios[dia].length-1 == batida ? hor_max : b2;

      var b1_orig = arr_horarios_orig[dia] && arr_horarios_orig[dia][batida] ? arr_horarios_orig[dia][batida][0] : '';
      var b2_orig = arr_horarios_orig[dia] && arr_horarios_orig[dia][batida] ? arr_horarios_orig[dia][batida][1] : '';

      //console.log(b1+' '+b1_orig);
      
      var css_b1_color_change = b1!=b1_orig ? 'background-color:#FF0' : 'background-color:#FFF';
      var css_b2_color_change = b2!=b2_orig ? 'background-color:#FF0' : 'background-color:#FFF';

      var css_erro = '';
      var str_alert = '';

      html += '<input size="5" style="'+css_b1_color_change+'" class="meuPonto dia'+cnt_dia+'" id="meuPonto'+cnt_dia+'-'+cnt_batida+'-1" value="'+(b1 || '')+'" val-orig="'+(b1_orig || '')+'">';
      html += '<input size="5" style="'+css_b2_color_change+'" class="meuPonto dia'+cnt_dia+'" id="meuPonto'+cnt_dia+'-'+cnt_batida+'-2" value="'+(b2 || '')+'" val-orig="'+(b2_orig || '')+'">';

      var saldo_batida = '';
      if(pattern_h.test(b1) && pattern_h.test(b2)) {

        saldo_batida = formatMsec(diffDate(b1,b2));
        saldo_horario_dia += diffDate(b1,b2);

        var b_hj_chk = true;    
        if(cnt_hoje) {
          for(var batida_chk in arr_horarios[dia]) {      
            var b1_chk = arr_horarios[dia][batida_chk][0];
            var b2_chk = arr_horarios[dia][batida_chk][1];
            b_hj_chk = b_hj_chk && pattern_h.test(b1_chk) && pattern_h.test(b2_chk) ? true : false;
          }
        }
        saldo_horario_mes += b_hj_chk ? diffDate(b1,b2) : 0;
        
      }       
      else {
        
        var saldo_rest = jornada_dia - (saldo_horario_dia || 0);    
        var hora_debito = formatMsec((saldo_rest < 0 ? saldo_rest*-1 : saldo_rest));
        
        css_erro = cnt_hoje > 0 ? 'background-color:#CCC' : (saldo_rest > 0 ? 'background-color:#F00' : 'background-color:#F9C8C8');

        if(pattern_h.test(b1) || pattern_h.test(b2)) {
          str_alert = '<span class="meuSaldo" style="color:#F00">('+(saldo_rest <=0 ? '+'+hora_debito+')' : '-'+hora_debito+') Saida '+formatDate(sumDateMsec(b1,saldo_rest),'HH:mm'))+'</span>';
          if(cnt_hoje < 1) cnt_erro++;
        }        

      }

      html += '<input size="5" class="meuSaldo" disabled style="'+css_erro+'" id="meuPonto'+cnt_dia+'-'+cnt_batida+'-saldo" value="'+saldo_batida+'">'+str_alert;         
      html += '<br class="meuSaldo">';

      cnt_batida++;
    }

    if(jornada_dia > saldo_horario_dia && cnt_hoje <= 0) css_saldo = 'color:#F00';


    html += '<input size="4" class="meuSaldo" style="margin-left:98px;font-weight:bold;'+css_saldo+'" disabled id="meuPonto'+cnt_dia+'-'+cnt_batida+'-saldo_horario_dia" value="'+formatMsec(saldo_horario_dia)+'">';         
    $('#conteinerdia'+cnt_dia).append(html);
    cnt_dia++;

  }

  return {'saldo_horario_mes':saldo_horario_mes,'cnt_erro':cnt_erro,'cnt_hoje':cnt_hoje};

}

var getArrJornadasHorariosCookie = function() {

  var arr_cookie = getArrCookie(id_cookie_periodo);  

  if(arr_cookie.length > 0) {
    
    var arr_jornadas_ck = arr_cookie[0];
    var arr_horarios_ck = arr_cookie[1];    
    /*var get_hor_min = arr_cookie[2];    
    var get_hor_max = arr_cookie[3];    */

  }
  else return {};

  return {'arr_jornadas_ck':arr_jornadas_ck,'arr_horarios_ck':arr_horarios_ck/*,'hor_min':get_hor_min,'hor_max':get_hor_max*/};

}

var setObjJornadasHorariosCookie = function(obj) {

  //console.log(obj['arr_horarios_ck']);

  var arr_cookie = [obj['arr_jornadas_ck'],obj['arr_horarios_ck']/*,obj['hor_min'],obj['hor_max']*/];  

  return setArrCookie(arr_cookie,id_cookie_periodo);

}

var redefineIntervalo = function() {

  //DEFINE INTERVALO
  if($('#horMin').length && $('#horMax').length) {

    hor_min = $('#horMin').val()==hor_min ? hor_min : $('#horMin').val();
    hor_max = $('#horMax').val()==hor_max ? hor_max : $('#horMax').val();
    hor_max = diffDate('00:00',hor_max)<=diffDate('00:00',hor_min) ? formatMsec(diffDate('00:00',hor_min)+3600000) : hor_max;

  }

  $('input.meuPonto[value="'+$('#horMin').attr('val-ant')+'"]').val('');
  $('input.meuPonto[value="'+$('#horMax').attr('val-ant')+'"]').val('');
  
  setConfigCookie({'hor_min':hor_min,'hor_max':hor_max});      

  $("#btnReload").click();

  return;

}

var getConfigCookie = function() {

  var arr_cookie = getArrCookie(id_cookie_config);  

  if(arr_cookie.length > 0) {
    
    var get_hor_min = arr_cookie[0];
    var get_hor_max = arr_cookie[1];    

  }
  else return {};

  return {'hor_min':get_hor_min,'hor_max':get_hor_max};

}

var setConfigCookie = function(obj) {
  
  var arr_cookie = [obj['hor_min'],obj['hor_max']];  

  return setArrCookie(arr_cookie,id_cookie_config);

}



var executaCalculo = function(saldo_jornada_mes_at,saldo_current,saldo_horario_mes,cnt_erro,cnt_hoje) {

  var banco_h_ant = $('#divSecaoSaldoMesAnterior > fieldset > table > tbody > tr:eq(0) > td:eq(1)').text().trim();  
  var saldo_b_h = diffHoraMsec(banco_h_ant);
  var saldo_current = saldo_horario_mes-saldo_jornada_acum_hj;  

  var img_logo_src = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHBhdGggZD0iTTI5Mi40NTIsMEMxNzEuMTU0LDAsNzMuMTQzLDk4LjI1Niw3My4xNDMsMjE5LjQyOUgwbDk0Ljk2NCw5NC45NjRsMS43MDksMy41MzYNCglsOTguMzc1LTk4LjVoLTczLjE0NGMwLTk0LjIzMiw3Ni40MzUtMTcwLjY2NywxNzAuNjY3LTE3MC42NjdjOTQuMjM4LDAsMTcwLjY2Nyw3Ni40MzUsMTcwLjY2NywxNzAuNjY3DQoJYzAsOTQuMjM4LTc2LjQyOSwxNzAuNjY3LTE3MC42NjcsMTcwLjY2N2MtNDcuMTc5LDAtODkuNzItMTkuMjYzLTEyMC41NjUtNTAuMDk2bC0zNC41LDM0LjQ4OA0KCWMzOS42MTksMzkuNzUsOTQuMzU3LDY0LjM2OSwxNTQuOTQ2LDY0LjM2OUM0MTMuNzM4LDQzOC44NTcsNTEyLDM0MC41OTYsNTEyLDIxOS40MjlDNTEyLDk4LjI1Niw0MTMuNzM4LDAsMjkyLjQ1Miwweg0KCSBNMjY4LjE5LDEyMS45MDRWMjQzLjgxbDEwNC4zNTcsNjEuOTI5bDE3LjU0OC0yOS42MTlsLTg1LjMzNC01MC41OTZWMTIxLjkwNEgyNjguMTl6IiBmaWxsPSIjMkQyRERFIi8+DQo8L3N2Zz4NCg==';
  
  //PEGA POSICAO E REMOVE
  var p_top = '10px';
  var p_left = 'calc(50% - 150px)';
  if($('#conteinerSaldoTotal').length) {
    var p = $('#conteinerSaldoTotal');
    var position = p.position();
    //alert("left: " + position.left + ", top: " + position.top);
    p_top = position.top+'px';
    p_left = position.left+'px';
    $('#conteinerSaldoTotal').remove();
  }

  

  var input_hor_min = '<input id="horMin" style="font-size:12px;text-align:center" class="meuIntervalo" size="4" value="'+(hor_min || '')+'" val-ant="'+(hor_min || '')+'">';
  var input_hor_max = '<input id="horMax" style="font-size:12px;text-align:center" class="meuIntervalo" size="4" value="'+(hor_max || '')+'" val-ant="'+(hor_max || '')+'">';
  
  $('table.tabela:eq(1) thead tr:eq(0) th:eq(3)').append('<div id="conteinerSaldoTotal" style="position:fixed;z-index:99999;left:'+p_left+';cursor:move;top:'+p_top+';width:300px;padding:20px;;border:1px solid #999;background-color:#EEE;opacity:0.9;line-height:30px;background-color:#FF0;font-weight:bold;font-size:15px;border-radius:10px"><span style="font-size:23px;color:#2D2DDE"><img style="height:35px;float:left" src="'+img_logo_src+'">Grifo-Check Plugin</span><br><br>Jornada: '+formatMsec(saldo_jornada_mes_at)+' <br><div>Limite: '+input_hor_min+'&nbsp;-&nbsp;'+input_hor_max+'</div><br><div style="border-top:2px solid #0012FF;border-bottom:2px solid #0012FF;font-weight:normal">Até o momento você esteve presente por <span style="font-weight:bold">'+formatMsec(saldo_horario_mes)+'h</span>'+(saldo_jornada_acum_hj!=0 ? ' de um total de <span style="font-weight:bold">'+formatMsec(saldo_jornada_acum_hj)+'h</span>. <br><span style="font-weight:bold; color:#23439D">Seu saldo corrente é </span><span style="font-weight:bold;text-decoration:underline;color:'+(saldo_current<0 ?'#F00':'#22A80C')+'">'+(saldo_current<0 ? '' : '+')+formatMsec(saldo_current)+'h</span>' : '')+'</div><br>'+(saldo_jornada_mes_at>saldo_horario_mes ? 'Falta' : 'Sobra')+': <span style="color:'+(saldo_jornada_mes_at-saldo_horario_mes>0 ?'#F00':'#22A80C')+'">'+formatMsec(saldo_horario_mes-saldo_jornada_mes_at)+'</span> ('+(total_dias-idx_hoje)+' dia(s)) '+(saldo_b_h ? ' <br><span style="color:#23439D">Banco horas: <span style="color:'+(saldo_b_h<0 ?'#F00':'#22A80C')+'">'+((1<0?'-':'')+banco_h_ant)+'</span></span><br><span style="color:#23439D">Saldo final: <span style="color:'+(saldo_horario_mes-saldo_jornada_mes_at+saldo_b_h<0 ?'#F00':'#22A80C')+'">'+formatMsec((saldo_horario_mes-saldo_jornada_mes_at)+saldo_b_h)+'</span></span>' : '')+((cnt_erro)>0 ? ' <br><span style="color:#F00">Corrigir: '+(cnt_erro)+'</span>' : '')+'<br><br><a style="padding:3px;background-color:#0012FF;color:#FFF" id="btnReload">Recalcular</a></div>');


  $("#conteinerSaldoTotal").draggable();

  $('#btnReload').click(function() {
    start();
  });

  $('input.meuPonto,input.minhaJornada').each(function(){

    $(this).mask('00:00');

    $(this).keyup(function(event) {

        if($(this).val()!=$(this).attr('val-orig')) {        
          $(this).css('background-color','#FC0');
        }
        else $(this).css('background-color','#FFF');

        if(event.keyCode === 13) {
          $("#btnReload").click();
        }
    });
  });

  $('input.meuIntervalo').each(function(){

    $(this).mask('00:00');

    $(this).keyup(function(event) {

        if(event.keyCode === 13) {
          redefineIntervalo();
        }
    });
  });

}

var check = function() {

  var edit_pessoa_gt = $('input[name=_pessoa]');
  var chk_campo_gt = edit_pessoa_gt.length ? (edit_pessoa_gt.val().trim() == str_nome.trim() ? true : false) : false;  
  console.log(edit_pessoa_gt.length+' '+edit_pessoa_gt.val() +' '+ str_nome+ ' '+chk_campo_gt);

  if($('#divSecaoResult .titulosecao_table').length && !$('#conteinerSaldoTotal').length && (!edit_pessoa_gt.length || (edit_pessoa_gt.length && chk_campo_gt))) {

    start();    

    $('#btnReload').click(function() {
      start();
    });

  }
  
  setTimeout(function(){check()},5000);
  return false;

}

var start = function() {
    
  setCkInputValues();  
  var arr_dados = getArrResultCk(/*arr_input['arr_jornadas_input'],arr_input['arr_horarios_input']*/);  
  var arr_result_j = setInputJornadas(arr_dados['arr_jornadas'],arr_dados['arr_jornadas_orig'],arr_dados['arr_horarios']);
  var arr_result_h = setInputHorarios(arr_dados['arr_jornadas'],arr_dados['arr_horarios'],arr_dados['arr_horarios_orig']);
  
  executaCalculo(arr_result_j.saldo_jornada_mes_at,arr_result_j.saldo_current,arr_result_h.saldo_horario_mes,arr_result_h.cnt_erro,arr_result_h.cnt_hoje);
  //console.table(getArrJornadasHorariosCookie());
  //console.table(arr_orig);


}


var setArrCookie = function(arr_cookie,id) {
  
  try {
    var str_cookie = JSON.stringify(arr_cookie);    
    Cookies.remove(id);
    Cookies.set(id,str_cookie,{expires:10000});
  }
  catch(e) {
    return false;
  }
  
  return true;

}

var getArrCookie = function(id) {
  
  try {
    var arr_cookie = JSON.parse(Cookies.get(id));
  }
  catch(e) {
    return [];
  }

  return arr_cookie;

}


function diffDate(d1,d2) {

  var date1 = new Date('08/05/2015 '+d1+':00');
  var date2 = new Date('08/05/2015 '+d2+':00');
  var diff = date2.getTime() - date1.getTime();

  return diff;

}

function diffHoraMsec(h) {

  var ftr_m = h.indexOf('-')!==-1 ? -1 : 1;
  h = ftr_m < 0 ? h.substring(1) : h;

  var date1 = new Date('08/05/2015 00:00');
  var date2 = new Date('08/05/2015 '+h+':00');
  var diff = date2.getTime() - date1.getTime();

  return diff*ftr_m;

}

function sumDateMsec(d1,msec) {

  var date1 = new Date('08/05/2015 '+d1+':00');  
  var sum = date1.getTime() + msec;

  return sum;

}

function formatMsec(msec) {

  var sig = msec<0 ? '-' : '';
  msec = msec<0 ? msec*-1 : msec;

  //var msec = diff;
  var hh = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  var mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;
  var ss = Math.floor(msec / 1000);
  msec -= ss * 1000;

  return sig + pad(hh,2) + ":" + pad(mm,2);  

}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function formatDate(time, format) {
  var t = new Date(time);
  var tf = function (i) { return (i < 10 ? '0' : '') + i };
  return format.replace(/yy|yyyy|MM|dd|HH|mm|ss/g, function (a) {
    switch (a) {
      case 'yyyy':
        return tf(t.getFullYear());
      break;
      case 'yy':        
        return tf(t.getFullYear()).substring(2,4);
      break;
      case 'MM':
        return tf(t.getMonth() + 1);
      break;
      case 'mm':
        return tf(t.getMinutes());
      break;
      case 'dd':
        return tf(t.getDate());
      break;
      case 'HH':
        return tf(t.getHours());
      break;
      case 'ss':
        return tf(t.getSeconds());
      break;
    }
  })
}

function trimArray(arr)
{
    for(var i=0;i<arr.length;i++)
    {
        arr[i] = arr[i].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    return arr;
}

//Cookie
//Original file: /npm/js-cookie@2.2.0/src/js.cookie.js

!function(e){var n=!1;if("function"==typeof define&&define.amd&&(define(e),n=!0),"object"==typeof exports&&(module.exports=e(),n=!0),!n){var o=window.Cookies,t=window.Cookies=e();t.noConflict=function(){return window.Cookies=o,t}}}(function(){function g(){for(var e=0,n={};e<arguments.length;e++){var o=arguments[e];for(var t in o)n[t]=o[t]}return n}return function e(l){function C(e,n,o){var t;if("undefined"!=typeof document){if(1<arguments.length){if("number"==typeof(o=g({path:"/"},C.defaults,o)).expires){var r=new Date;r.setMilliseconds(r.getMilliseconds()+864e5*o.expires),o.expires=r}o.expires=o.expires?o.expires.toUTCString():"";try{t=JSON.stringify(n),/^[\{\[]/.test(t)&&(n=t)}catch(e){}n=l.write?l.write(n,e):encodeURIComponent(String(n)).replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,decodeURIComponent),e=(e=(e=encodeURIComponent(String(e))).replace(/%(23|24|26|2B|5E|60|7C)/g,decodeURIComponent)).replace(/[\(\)]/g,escape);var i="";for(var c in o)o[c]&&(i+="; "+c,!0!==o[c]&&(i+="="+o[c]));return document.cookie=e+"="+n+i}e||(t={});for(var a=document.cookie?document.cookie.split("; "):[],s=/(%[0-9A-Z]{2})+/g,f=0;f<a.length;f++){var p=a[f].split("="),d=p.slice(1).join("=");this.json||'"'!==d.charAt(0)||(d=d.slice(1,-1));try{var u=p[0].replace(s,decodeURIComponent);if(d=l.read?l.read(d,u):l(d,u)||d.replace(s,decodeURIComponent),this.json)try{d=JSON.parse(d)}catch(e){}if(e===u){t=d;break}e||(t[u]=d)}catch(e){}}return t}}return(C.set=C).get=function(e){return C.call(C,e)},C.getJSON=function(){return C.apply({json:!0},[].slice.call(arguments))},C.defaults={},C.remove=function(e,n){C(e,"",g(n,{expires:-1}))},C.withConverter=e,C}(function(){})});

// jQuery Mask Plugin v1.14.15
// github.com/igorescobar/jQuery-Mask-Plugin
var $jscomp={scope:{},findInternal:function(a,l,d){a instanceof String&&(a=String(a));for(var p=a.length,h=0;h<p;h++){var b=a[h];if(l.call(d,b,h,a))return{i:h,v:b}}return{i:-1,v:void 0}}};$jscomp.defineProperty="function"==typeof Object.defineProperties?Object.defineProperty:function(a,l,d){if(d.get||d.set)throw new TypeError("ES3 does not support getters and setters.");a!=Array.prototype&&a!=Object.prototype&&(a[l]=d.value)};
$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);$jscomp.polyfill=function(a,l,d,p){if(l){d=$jscomp.global;a=a.split(".");for(p=0;p<a.length-1;p++){var h=a[p];h in d||(d[h]={});d=d[h]}a=a[a.length-1];p=d[a];l=l(p);l!=p&&null!=l&&$jscomp.defineProperty(d,a,{configurable:!0,writable:!0,value:l})}};
$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,d){return $jscomp.findInternal(this,a,d).v}},"es6-impl","es3");
(function(a,l,d){"function"===typeof define&&define.amd?define(["jquery"],a):"object"===typeof exports?module.exports=a(require("jquery")):a(l||d)})(function(a){var l=function(b,e,f){var c={invalid:[],getCaret:function(){try{var a,r=0,g=b.get(0),e=document.selection,f=g.selectionStart;if(e&&-1===navigator.appVersion.indexOf("MSIE 10"))a=e.createRange(),a.moveStart("character",-c.val().length),r=a.text.length;else if(f||"0"===f)r=f;return r}catch(C){}},setCaret:function(a){try{if(b.is(":focus")){var c,
g=b.get(0);g.setSelectionRange?g.setSelectionRange(a,a):(c=g.createTextRange(),c.collapse(!0),c.moveEnd("character",a),c.moveStart("character",a),c.select())}}catch(B){}},events:function(){b.on("keydown.mask",function(a){b.data("mask-keycode",a.keyCode||a.which);b.data("mask-previus-value",b.val());b.data("mask-previus-caret-pos",c.getCaret());c.maskDigitPosMapOld=c.maskDigitPosMap}).on(a.jMaskGlobals.useInput?"input.mask":"keyup.mask",c.behaviour).on("paste.mask drop.mask",function(){setTimeout(function(){b.keydown().keyup()},
100)}).on("change.mask",function(){b.data("changed",!0)}).on("blur.mask",function(){d===c.val()||b.data("changed")||b.trigger("change");b.data("changed",!1)}).on("blur.mask",function(){d=c.val()}).on("focus.mask",function(b){!0===f.selectOnFocus&&a(b.target).select()}).on("focusout.mask",function(){f.clearIfNotMatch&&!h.test(c.val())&&c.val("")})},getRegexMask:function(){for(var a=[],b,c,f,n,d=0;d<e.length;d++)(b=m.translation[e.charAt(d)])?(c=b.pattern.toString().replace(/.{1}$|^.{1}/g,""),f=b.optional,
(b=b.recursive)?(a.push(e.charAt(d)),n={digit:e.charAt(d),pattern:c}):a.push(f||b?c+"?":c)):a.push(e.charAt(d).replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&"));a=a.join("");n&&(a=a.replace(new RegExp("("+n.digit+"(.*"+n.digit+")?)"),"($1)?").replace(new RegExp(n.digit,"g"),n.pattern));return new RegExp(a)},destroyEvents:function(){b.off("input keydown keyup paste drop blur focusout ".split(" ").join(".mask "))},val:function(a){var c=b.is("input")?"val":"text";if(0<arguments.length){if(b[c]()!==a)b[c](a);
c=b}else c=b[c]();return c},calculateCaretPosition:function(){var a=b.data("mask-previus-value")||"",e=c.getMasked(),g=c.getCaret();if(a!==e){var f=b.data("mask-previus-caret-pos")||0,e=e.length,d=a.length,m=a=0,h=0,l=0,k;for(k=g;k<e&&c.maskDigitPosMap[k];k++)m++;for(k=g-1;0<=k&&c.maskDigitPosMap[k];k--)a++;for(k=g-1;0<=k;k--)c.maskDigitPosMap[k]&&h++;for(k=f-1;0<=k;k--)c.maskDigitPosMapOld[k]&&l++;g>d?g=10*e:f>=g&&f!==d?c.maskDigitPosMapOld[g]||(f=g,g=g-(l-h)-a,c.maskDigitPosMap[g]&&(g=f)):g>f&&
(g=g+(h-l)+m)}return g},behaviour:function(f){f=f||window.event;c.invalid=[];var e=b.data("mask-keycode");if(-1===a.inArray(e,m.byPassKeys)){var e=c.getMasked(),g=c.getCaret();setTimeout(function(){c.setCaret(c.calculateCaretPosition())},a.jMaskGlobals.keyStrokeCompensation);c.val(e);c.setCaret(g);return c.callbacks(f)}},getMasked:function(a,b){var g=[],d=void 0===b?c.val():b+"",n=0,h=e.length,q=0,l=d.length,k=1,r="push",p=-1,t=0,y=[],v,z;f.reverse?(r="unshift",k=-1,v=0,n=h-1,q=l-1,z=function(){return-1<
n&&-1<q}):(v=h-1,z=function(){return n<h&&q<l});for(var A;z();){var x=e.charAt(n),w=d.charAt(q),u=m.translation[x];if(u)w.match(u.pattern)?(g[r](w),u.recursive&&(-1===p?p=n:n===v&&n!==p&&(n=p-k),v===p&&(n-=k)),n+=k):w===A?(t--,A=void 0):u.optional?(n+=k,q-=k):u.fallback?(g[r](u.fallback),n+=k,q-=k):c.invalid.push({p:q,v:w,e:u.pattern}),q+=k;else{if(!a)g[r](x);w===x?(y.push(q),q+=k):(A=x,y.push(q+t),t++);n+=k}}d=e.charAt(v);h!==l+1||m.translation[d]||g.push(d);g=g.join("");c.mapMaskdigitPositions(g,
y,l);return g},mapMaskdigitPositions:function(a,b,e){a=f.reverse?a.length-e:0;c.maskDigitPosMap={};for(e=0;e<b.length;e++)c.maskDigitPosMap[b[e]+a]=1},callbacks:function(a){var h=c.val(),g=h!==d,m=[h,a,b,f],q=function(a,b,c){"function"===typeof f[a]&&b&&f[a].apply(this,c)};q("onChange",!0===g,m);q("onKeyPress",!0===g,m);q("onComplete",h.length===e.length,m);q("onInvalid",0<c.invalid.length,[h,a,b,c.invalid,f])}};b=a(b);var m=this,d=c.val(),h;e="function"===typeof e?e(c.val(),void 0,b,f):e;m.mask=
e;m.options=f;m.remove=function(){var a=c.getCaret();m.options.placeholder&&b.removeAttr("placeholder");b.data("mask-maxlength")&&b.removeAttr("maxlength");c.destroyEvents();c.val(m.getCleanVal());c.setCaret(a);return b};m.getCleanVal=function(){return c.getMasked(!0)};m.getMaskedVal=function(a){return c.getMasked(!1,a)};m.init=function(d){d=d||!1;f=f||{};m.clearIfNotMatch=a.jMaskGlobals.clearIfNotMatch;m.byPassKeys=a.jMaskGlobals.byPassKeys;m.translation=a.extend({},a.jMaskGlobals.translation,f.translation);
m=a.extend(!0,{},m,f);h=c.getRegexMask();if(d)c.events(),c.val(c.getMasked());else{f.placeholder&&b.attr("placeholder",f.placeholder);b.data("mask")&&b.attr("autocomplete","off");d=0;for(var l=!0;d<e.length;d++){var g=m.translation[e.charAt(d)];if(g&&g.recursive){l=!1;break}}l&&b.attr("maxlength",e.length).data("mask-maxlength",!0);c.destroyEvents();c.events();d=c.getCaret();c.val(c.getMasked());c.setCaret(d)}};m.init(!b.is("input"))};a.maskWatchers={};var d=function(){var b=a(this),e={},f=b.attr("data-mask");
b.attr("data-mask-reverse")&&(e.reverse=!0);b.attr("data-mask-clearifnotmatch")&&(e.clearIfNotMatch=!0);"true"===b.attr("data-mask-selectonfocus")&&(e.selectOnFocus=!0);if(p(b,f,e))return b.data("mask",new l(this,f,e))},p=function(b,e,f){f=f||{};var c=a(b).data("mask"),d=JSON.stringify;b=a(b).val()||a(b).text();try{return"function"===typeof e&&(e=e(b)),"object"!==typeof c||d(c.options)!==d(f)||c.mask!==e}catch(t){}},h=function(a){var b=document.createElement("div"),d;a="on"+a;d=a in b;d||(b.setAttribute(a,
"return;"),d="function"===typeof b[a]);return d};a.fn.mask=function(b,d){d=d||{};var e=this.selector,c=a.jMaskGlobals,h=c.watchInterval,c=d.watchInputs||c.watchInputs,t=function(){if(p(this,b,d))return a(this).data("mask",new l(this,b,d))};a(this).each(t);e&&""!==e&&c&&(clearInterval(a.maskWatchers[e]),a.maskWatchers[e]=setInterval(function(){a(document).find(e).each(t)},h));return this};a.fn.masked=function(a){return this.data("mask").getMaskedVal(a)};a.fn.unmask=function(){clearInterval(a.maskWatchers[this.selector]);
delete a.maskWatchers[this.selector];return this.each(function(){var b=a(this).data("mask");b&&b.remove().removeData("mask")})};a.fn.cleanVal=function(){return this.data("mask").getCleanVal()};a.applyDataMask=function(b){b=b||a.jMaskGlobals.maskElements;(b instanceof a?b:a(b)).filter(a.jMaskGlobals.dataMaskAttr).each(d)};h={maskElements:"input,td,span,div",dataMaskAttr:"*[data-mask]",dataMask:!0,watchInterval:300,watchInputs:!0,keyStrokeCompensation:10,useInput:!/Chrome\/[2-4][0-9]|SamsungBrowser/.test(window.navigator.userAgent)&&
h("input"),watchDataMask:!1,byPassKeys:[9,16,17,18,36,37,38,39,40,91],translation:{0:{pattern:/\d/},9:{pattern:/\d/,optional:!0},"#":{pattern:/\d/,recursive:!0},A:{pattern:/[a-zA-Z0-9]/},S:{pattern:/[a-zA-Z]/}}};a.jMaskGlobals=a.jMaskGlobals||{};h=a.jMaskGlobals=a.extend(!0,{},h,a.jMaskGlobals);h.dataMask&&a.applyDataMask();setInterval(function(){a.jMaskGlobals.watchDataMask&&a.applyDataMask()},h.watchInterval)},window.jQuery,window.Zepto);

(function(t){"function"==typeof define&&define.amd?define(["jquery"],t):t(jQuery)})(function(t){t.ui=t.ui||{},t.ui.version="1.12.1";var e=0,i=Array.prototype.slice;t.cleanData=function(e){return function(i){var s,n,o;for(o=0;null!=(n=i[o]);o++)try{s=t._data(n,"events"),s&&s.remove&&t(n).triggerHandler("remove")}catch(a){}e(i)}}(t.cleanData),t.widget=function(e,i,s){var n,o,a,r={},l=e.split(".")[0];e=e.split(".")[1];var h=l+"-"+e;return s||(s=i,i=t.Widget),t.isArray(s)&&(s=t.extend.apply(null,[{}].concat(s))),t.expr[":"][h.toLowerCase()]=function(e){return!!t.data(e,h)},t[l]=t[l]||{},n=t[l][e],o=t[l][e]=function(t,e){return this._createWidget?(arguments.length&&this._createWidget(t,e),void 0):new o(t,e)},t.extend(o,n,{version:s.version,_proto:t.extend({},s),_childConstructors:[]}),a=new i,a.options=t.widget.extend({},a.options),t.each(s,function(e,s){return t.isFunction(s)?(r[e]=function(){function t(){return i.prototype[e].apply(this,arguments)}function n(t){return i.prototype[e].apply(this,t)}return function(){var e,i=this._super,o=this._superApply;return this._super=t,this._superApply=n,e=s.apply(this,arguments),this._super=i,this._superApply=o,e}}(),void 0):(r[e]=s,void 0)}),o.prototype=t.widget.extend(a,{widgetEventPrefix:n?a.widgetEventPrefix||e:e},r,{constructor:o,namespace:l,widgetName:e,widgetFullName:h}),n?(t.each(n._childConstructors,function(e,i){var s=i.prototype;t.widget(s.namespace+"."+s.widgetName,o,i._proto)}),delete n._childConstructors):i._childConstructors.push(o),t.widget.bridge(e,o),o},t.widget.extend=function(e){for(var s,n,o=i.call(arguments,1),a=0,r=o.length;r>a;a++)for(s in o[a])n=o[a][s],o[a].hasOwnProperty(s)&&void 0!==n&&(e[s]=t.isPlainObject(n)?t.isPlainObject(e[s])?t.widget.extend({},e[s],n):t.widget.extend({},n):n);return e},t.widget.bridge=function(e,s){var n=s.prototype.widgetFullName||e;t.fn[e]=function(o){var a="string"==typeof o,r=i.call(arguments,1),l=this;return a?this.length||"instance"!==o?this.each(function(){var i,s=t.data(this,n);return"instance"===o?(l=s,!1):s?t.isFunction(s[o])&&"_"!==o.charAt(0)?(i=s[o].apply(s,r),i!==s&&void 0!==i?(l=i&&i.jquery?l.pushStack(i.get()):i,!1):void 0):t.error("no such method '"+o+"' for "+e+" widget instance"):t.error("cannot call methods on "+e+" prior to initialization; "+"attempted to call method '"+o+"'")}):l=void 0:(r.length&&(o=t.widget.extend.apply(null,[o].concat(r))),this.each(function(){var e=t.data(this,n);e?(e.option(o||{}),e._init&&e._init()):t.data(this,n,new s(o,this))})),l}},t.Widget=function(){},t.Widget._childConstructors=[],t.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{classes:{},disabled:!1,create:null},_createWidget:function(i,s){s=t(s||this.defaultElement||this)[0],this.element=t(s),this.uuid=e++,this.eventNamespace="."+this.widgetName+this.uuid,this.bindings=t(),this.hoverable=t(),this.focusable=t(),this.classesElementLookup={},s!==this&&(t.data(s,this.widgetFullName,this),this._on(!0,this.element,{remove:function(t){t.target===s&&this.destroy()}}),this.document=t(s.style?s.ownerDocument:s.document||s),this.window=t(this.document[0].defaultView||this.document[0].parentWindow)),this.options=t.widget.extend({},this.options,this._getCreateOptions(),i),this._create(),this.options.disabled&&this._setOptionDisabled(this.options.disabled),this._trigger("create",null,this._getCreateEventData()),this._init()},_getCreateOptions:function(){return{}},_getCreateEventData:t.noop,_create:t.noop,_init:t.noop,destroy:function(){var e=this;this._destroy(),t.each(this.classesElementLookup,function(t,i){e._removeClass(i,t)}),this.element.off(this.eventNamespace).removeData(this.widgetFullName),this.widget().off(this.eventNamespace).removeAttr("aria-disabled"),this.bindings.off(this.eventNamespace)},_destroy:t.noop,widget:function(){return this.element},option:function(e,i){var s,n,o,a=e;if(0===arguments.length)return t.widget.extend({},this.options);if("string"==typeof e)if(a={},s=e.split("."),e=s.shift(),s.length){for(n=a[e]=t.widget.extend({},this.options[e]),o=0;s.length-1>o;o++)n[s[o]]=n[s[o]]||{},n=n[s[o]];if(e=s.pop(),1===arguments.length)return void 0===n[e]?null:n[e];n[e]=i}else{if(1===arguments.length)return void 0===this.options[e]?null:this.options[e];a[e]=i}return this._setOptions(a),this},_setOptions:function(t){var e;for(e in t)this._setOption(e,t[e]);return this},_setOption:function(t,e){return"classes"===t&&this._setOptionClasses(e),this.options[t]=e,"disabled"===t&&this._setOptionDisabled(e),this},_setOptionClasses:function(e){var i,s,n;for(i in e)n=this.classesElementLookup[i],e[i]!==this.options.classes[i]&&n&&n.length&&(s=t(n.get()),this._removeClass(n,i),s.addClass(this._classes({element:s,keys:i,classes:e,add:!0})))},_setOptionDisabled:function(t){this._toggleClass(this.widget(),this.widgetFullName+"-disabled",null,!!t),t&&(this._removeClass(this.hoverable,null,"ui-state-hover"),this._removeClass(this.focusable,null,"ui-state-focus"))},enable:function(){return this._setOptions({disabled:!1})},disable:function(){return this._setOptions({disabled:!0})},_classes:function(e){function i(i,o){var a,r;for(r=0;i.length>r;r++)a=n.classesElementLookup[i[r]]||t(),a=e.add?t(t.unique(a.get().concat(e.element.get()))):t(a.not(e.element).get()),n.classesElementLookup[i[r]]=a,s.push(i[r]),o&&e.classes[i[r]]&&s.push(e.classes[i[r]])}var s=[],n=this;return e=t.extend({element:this.element,classes:this.options.classes||{}},e),this._on(e.element,{remove:"_untrackClassesElement"}),e.keys&&i(e.keys.match(/\S+/g)||[],!0),e.extra&&i(e.extra.match(/\S+/g)||[]),s.join(" ")},_untrackClassesElement:function(e){var i=this;t.each(i.classesElementLookup,function(s,n){-1!==t.inArray(e.target,n)&&(i.classesElementLookup[s]=t(n.not(e.target).get()))})},_removeClass:function(t,e,i){return this._toggleClass(t,e,i,!1)},_addClass:function(t,e,i){return this._toggleClass(t,e,i,!0)},_toggleClass:function(t,e,i,s){s="boolean"==typeof s?s:i;var n="string"==typeof t||null===t,o={extra:n?e:i,keys:n?t:e,element:n?this.element:t,add:s};return o.element.toggleClass(this._classes(o),s),this},_on:function(e,i,s){var n,o=this;"boolean"!=typeof e&&(s=i,i=e,e=!1),s?(i=n=t(i),this.bindings=this.bindings.add(i)):(s=i,i=this.element,n=this.widget()),t.each(s,function(s,a){function r(){return e||o.options.disabled!==!0&&!t(this).hasClass("ui-state-disabled")?("string"==typeof a?o[a]:a).apply(o,arguments):void 0}"string"!=typeof a&&(r.guid=a.guid=a.guid||r.guid||t.guid++);var l=s.match(/^([\w:-]*)\s*(.*)$/),h=l[1]+o.eventNamespace,c=l[2];c?n.on(h,c,r):i.on(h,r)})},_off:function(e,i){i=(i||"").split(" ").join(this.eventNamespace+" ")+this.eventNamespace,e.off(i).off(i),this.bindings=t(this.bindings.not(e).get()),this.focusable=t(this.focusable.not(e).get()),this.hoverable=t(this.hoverable.not(e).get())},_delay:function(t,e){function i(){return("string"==typeof t?s[t]:t).apply(s,arguments)}var s=this;return setTimeout(i,e||0)},_hoverable:function(e){this.hoverable=this.hoverable.add(e),this._on(e,{mouseenter:function(e){this._addClass(t(e.currentTarget),null,"ui-state-hover")},mouseleave:function(e){this._removeClass(t(e.currentTarget),null,"ui-state-hover")}})},_focusable:function(e){this.focusable=this.focusable.add(e),this._on(e,{focusin:function(e){this._addClass(t(e.currentTarget),null,"ui-state-focus")},focusout:function(e){this._removeClass(t(e.currentTarget),null,"ui-state-focus")}})},_trigger:function(e,i,s){var n,o,a=this.options[e];if(s=s||{},i=t.Event(i),i.type=(e===this.widgetEventPrefix?e:this.widgetEventPrefix+e).toLowerCase(),i.target=this.element[0],o=i.originalEvent)for(n in o)n in i||(i[n]=o[n]);return this.element.trigger(i,s),!(t.isFunction(a)&&a.apply(this.element[0],[i].concat(s))===!1||i.isDefaultPrevented())}},t.each({show:"fadeIn",hide:"fadeOut"},function(e,i){t.Widget.prototype["_"+e]=function(s,n,o){"string"==typeof n&&(n={effect:n});var a,r=n?n===!0||"number"==typeof n?i:n.effect||i:e;n=n||{},"number"==typeof n&&(n={duration:n}),a=!t.isEmptyObject(n),n.complete=o,n.delay&&s.delay(n.delay),a&&t.effects&&t.effects.effect[r]?s[e](n):r!==e&&s[r]?s[r](n.duration,n.easing,o):s.queue(function(i){t(this)[e](),o&&o.call(s[0]),i()})}}),t.widget,t.extend(t.expr[":"],{data:t.expr.createPseudo?t.expr.createPseudo(function(e){return function(i){return!!t.data(i,e)}}):function(e,i,s){return!!t.data(e,s[3])}}),t.fn.scrollParent=function(e){var i=this.css("position"),s="absolute"===i,n=e?/(auto|scroll|hidden)/:/(auto|scroll)/,o=this.parents().filter(function(){var e=t(this);return s&&"static"===e.css("position")?!1:n.test(e.css("overflow")+e.css("overflow-y")+e.css("overflow-x"))}).eq(0);return"fixed"!==i&&o.length?o:t(this[0].ownerDocument||document)},t.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase());var s=!1;t(document).on("mouseup",function(){s=!1}),t.widget("ui.mouse",{version:"1.12.1",options:{cancel:"input, textarea, button, select, option",distance:1,delay:0},_mouseInit:function(){var e=this;this.element.on("mousedown."+this.widgetName,function(t){return e._mouseDown(t)}).on("click."+this.widgetName,function(i){return!0===t.data(i.target,e.widgetName+".preventClickEvent")?(t.removeData(i.target,e.widgetName+".preventClickEvent"),i.stopImmediatePropagation(),!1):void 0}),this.started=!1},_mouseDestroy:function(){this.element.off("."+this.widgetName),this._mouseMoveDelegate&&this.document.off("mousemove."+this.widgetName,this._mouseMoveDelegate).off("mouseup."+this.widgetName,this._mouseUpDelegate)},_mouseDown:function(e){if(!s){this._mouseMoved=!1,this._mouseStarted&&this._mouseUp(e),this._mouseDownEvent=e;var i=this,n=1===e.which,o="string"==typeof this.options.cancel&&e.target.nodeName?t(e.target).closest(this.options.cancel).length:!1;return n&&!o&&this._mouseCapture(e)?(this.mouseDelayMet=!this.options.delay,this.mouseDelayMet||(this._mouseDelayTimer=setTimeout(function(){i.mouseDelayMet=!0},this.options.delay)),this._mouseDistanceMet(e)&&this._mouseDelayMet(e)&&(this._mouseStarted=this._mouseStart(e)!==!1,!this._mouseStarted)?(e.preventDefault(),!0):(!0===t.data(e.target,this.widgetName+".preventClickEvent")&&t.removeData(e.target,this.widgetName+".preventClickEvent"),this._mouseMoveDelegate=function(t){return i._mouseMove(t)},this._mouseUpDelegate=function(t){return i._mouseUp(t)},this.document.on("mousemove."+this.widgetName,this._mouseMoveDelegate).on("mouseup."+this.widgetName,this._mouseUpDelegate),e.preventDefault(),s=!0,!0)):!0}},_mouseMove:function(e){if(this._mouseMoved){if(t.ui.ie&&(!document.documentMode||9>document.documentMode)&&!e.button)return this._mouseUp(e);if(!e.which)if(e.originalEvent.altKey||e.originalEvent.ctrlKey||e.originalEvent.metaKey||e.originalEvent.shiftKey)this.ignoreMissingWhich=!0;else if(!this.ignoreMissingWhich)return this._mouseUp(e)}return(e.which||e.button)&&(this._mouseMoved=!0),this._mouseStarted?(this._mouseDrag(e),e.preventDefault()):(this._mouseDistanceMet(e)&&this._mouseDelayMet(e)&&(this._mouseStarted=this._mouseStart(this._mouseDownEvent,e)!==!1,this._mouseStarted?this._mouseDrag(e):this._mouseUp(e)),!this._mouseStarted)},_mouseUp:function(e){this.document.off("mousemove."+this.widgetName,this._mouseMoveDelegate).off("mouseup."+this.widgetName,this._mouseUpDelegate),this._mouseStarted&&(this._mouseStarted=!1,e.target===this._mouseDownEvent.target&&t.data(e.target,this.widgetName+".preventClickEvent",!0),this._mouseStop(e)),this._mouseDelayTimer&&(clearTimeout(this._mouseDelayTimer),delete this._mouseDelayTimer),this.ignoreMissingWhich=!1,s=!1,e.preventDefault()},_mouseDistanceMet:function(t){return Math.max(Math.abs(this._mouseDownEvent.pageX-t.pageX),Math.abs(this._mouseDownEvent.pageY-t.pageY))>=this.options.distance},_mouseDelayMet:function(){return this.mouseDelayMet},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return!0}}),t.ui.plugin={add:function(e,i,s){var n,o=t.ui[e].prototype;for(n in s)o.plugins[n]=o.plugins[n]||[],o.plugins[n].push([i,s[n]])},call:function(t,e,i,s){var n,o=t.plugins[e];if(o&&(s||t.element[0].parentNode&&11!==t.element[0].parentNode.nodeType))for(n=0;o.length>n;n++)t.options[o[n][0]]&&o[n][1].apply(t.element,i)}},t.ui.safeActiveElement=function(t){var e;try{e=t.activeElement}catch(i){e=t.body}return e||(e=t.body),e.nodeName||(e=t.body),e},t.ui.safeBlur=function(e){e&&"body"!==e.nodeName.toLowerCase()&&t(e).trigger("blur")},t.widget("ui.draggable",t.ui.mouse,{version:"1.12.1",widgetEventPrefix:"drag",options:{addClasses:!0,appendTo:"parent",axis:!1,connectToSortable:!1,containment:!1,cursor:"auto",cursorAt:!1,grid:!1,handle:!1,helper:"original",iframeFix:!1,opacity:!1,refreshPositions:!1,revert:!1,revertDuration:500,scope:"default",scroll:!0,scrollSensitivity:20,scrollSpeed:20,snap:!1,snapMode:"both",snapTolerance:20,stack:!1,zIndex:!1,drag:null,start:null,stop:null},_create:function(){"original"===this.options.helper&&this._setPositionRelative(),this.options.addClasses&&this._addClass("ui-draggable"),this._setHandleClassName(),this._mouseInit()},_setOption:function(t,e){this._super(t,e),"handle"===t&&(this._removeHandleClassName(),this._setHandleClassName())},_destroy:function(){return(this.helper||this.element).is(".ui-draggable-dragging")?(this.destroyOnClear=!0,void 0):(this._removeHandleClassName(),this._mouseDestroy(),void 0)},_mouseCapture:function(e){var i=this.options;return this.helper||i.disabled||t(e.target).closest(".ui-resizable-handle").length>0?!1:(this.handle=this._getHandle(e),this.handle?(this._blurActiveElement(e),this._blockFrames(i.iframeFix===!0?"iframe":i.iframeFix),!0):!1)},_blockFrames:function(e){this.iframeBlocks=this.document.find(e).map(function(){var e=t(this);return t("<div>").css("position","absolute").appendTo(e.parent()).outerWidth(e.outerWidth()).outerHeight(e.outerHeight()).offset(e.offset())[0]})},_unblockFrames:function(){this.iframeBlocks&&(this.iframeBlocks.remove(),delete this.iframeBlocks)},_blurActiveElement:function(e){var i=t.ui.safeActiveElement(this.document[0]),s=t(e.target);s.closest(i).length||t.ui.safeBlur(i)},_mouseStart:function(e){var i=this.options;return this.helper=this._createHelper(e),this._addClass(this.helper,"ui-draggable-dragging"),this._cacheHelperProportions(),t.ui.ddmanager&&(t.ui.ddmanager.current=this),this._cacheMargins(),this.cssPosition=this.helper.css("position"),this.scrollParent=this.helper.scrollParent(!0),this.offsetParent=this.helper.offsetParent(),this.hasFixedAncestor=this.helper.parents().filter(function(){return"fixed"===t(this).css("position")}).length>0,this.positionAbs=this.element.offset(),this._refreshOffsets(e),this.originalPosition=this.position=this._generatePosition(e,!1),this.originalPageX=e.pageX,this.originalPageY=e.pageY,i.cursorAt&&this._adjustOffsetFromHelper(i.cursorAt),this._setContainment(),this._trigger("start",e)===!1?(this._clear(),!1):(this._cacheHelperProportions(),t.ui.ddmanager&&!i.dropBehaviour&&t.ui.ddmanager.prepareOffsets(this,e),this._mouseDrag(e,!0),t.ui.ddmanager&&t.ui.ddmanager.dragStart(this,e),!0)},_refreshOffsets:function(t){this.offset={top:this.positionAbs.top-this.margins.top,left:this.positionAbs.left-this.margins.left,scroll:!1,parent:this._getParentOffset(),relative:this._getRelativeOffset()},this.offset.click={left:t.pageX-this.offset.left,top:t.pageY-this.offset.top}},_mouseDrag:function(e,i){if(this.hasFixedAncestor&&(this.offset.parent=this._getParentOffset()),this.position=this._generatePosition(e,!0),this.positionAbs=this._convertPositionTo("absolute"),!i){var s=this._uiHash();if(this._trigger("drag",e,s)===!1)return this._mouseUp(new t.Event("mouseup",e)),!1;this.position=s.position}return this.helper[0].style.left=this.position.left+"px",this.helper[0].style.top=this.position.top+"px",t.ui.ddmanager&&t.ui.ddmanager.drag(this,e),!1},_mouseStop:function(e){var i=this,s=!1;return t.ui.ddmanager&&!this.options.dropBehaviour&&(s=t.ui.ddmanager.drop(this,e)),this.dropped&&(s=this.dropped,this.dropped=!1),"invalid"===this.options.revert&&!s||"valid"===this.options.revert&&s||this.options.revert===!0||t.isFunction(this.options.revert)&&this.options.revert.call(this.element,s)?t(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){i._trigger("stop",e)!==!1&&i._clear()}):this._trigger("stop",e)!==!1&&this._clear(),!1},_mouseUp:function(e){return this._unblockFrames(),t.ui.ddmanager&&t.ui.ddmanager.dragStop(this,e),this.handleElement.is(e.target)&&this.element.trigger("focus"),t.ui.mouse.prototype._mouseUp.call(this,e)},cancel:function(){return this.helper.is(".ui-draggable-dragging")?this._mouseUp(new t.Event("mouseup",{target:this.element[0]})):this._clear(),this},_getHandle:function(e){return this.options.handle?!!t(e.target).closest(this.element.find(this.options.handle)).length:!0},_setHandleClassName:function(){this.handleElement=this.options.handle?this.element.find(this.options.handle):this.element,this._addClass(this.handleElement,"ui-draggable-handle")},_removeHandleClassName:function(){this._removeClass(this.handleElement,"ui-draggable-handle")},_createHelper:function(e){var i=this.options,s=t.isFunction(i.helper),n=s?t(i.helper.apply(this.element[0],[e])):"clone"===i.helper?this.element.clone().removeAttr("id"):this.element;return n.parents("body").length||n.appendTo("parent"===i.appendTo?this.element[0].parentNode:i.appendTo),s&&n[0]===this.element[0]&&this._setPositionRelative(),n[0]===this.element[0]||/(fixed|absolute)/.test(n.css("position"))||n.css("position","absolute"),n},_setPositionRelative:function(){/^(?:r|a|f)/.test(this.element.css("position"))||(this.element[0].style.position="relative")},_adjustOffsetFromHelper:function(e){"string"==typeof e&&(e=e.split(" ")),t.isArray(e)&&(e={left:+e[0],top:+e[1]||0}),"left"in e&&(this.offset.click.left=e.left+this.margins.left),"right"in e&&(this.offset.click.left=this.helperProportions.width-e.right+this.margins.left),"top"in e&&(this.offset.click.top=e.top+this.margins.top),"bottom"in e&&(this.offset.click.top=this.helperProportions.height-e.bottom+this.margins.top)},_isRootNode:function(t){return/(html|body)/i.test(t.tagName)||t===this.document[0]},_getParentOffset:function(){var e=this.offsetParent.offset(),i=this.document[0];return"absolute"===this.cssPosition&&this.scrollParent[0]!==i&&t.contains(this.scrollParent[0],this.offsetParent[0])&&(e.left+=this.scrollParent.scrollLeft(),e.top+=this.scrollParent.scrollTop()),this._isRootNode(this.offsetParent[0])&&(e={top:0,left:0}),{top:e.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:e.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if("relative"!==this.cssPosition)return{top:0,left:0};var t=this.element.position(),e=this._isRootNode(this.scrollParent[0]);return{top:t.top-(parseInt(this.helper.css("top"),10)||0)+(e?0:this.scrollParent.scrollTop()),left:t.left-(parseInt(this.helper.css("left"),10)||0)+(e?0:this.scrollParent.scrollLeft())}},_cacheMargins:function(){this.margins={left:parseInt(this.element.css("marginLeft"),10)||0,top:parseInt(this.element.css("marginTop"),10)||0,right:parseInt(this.element.css("marginRight"),10)||0,bottom:parseInt(this.element.css("marginBottom"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var e,i,s,n=this.options,o=this.document[0];return this.relativeContainer=null,n.containment?"window"===n.containment?(this.containment=[t(window).scrollLeft()-this.offset.relative.left-this.offset.parent.left,t(window).scrollTop()-this.offset.relative.top-this.offset.parent.top,t(window).scrollLeft()+t(window).width()-this.helperProportions.width-this.margins.left,t(window).scrollTop()+(t(window).height()||o.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top],void 0):"document"===n.containment?(this.containment=[0,0,t(o).width()-this.helperProportions.width-this.margins.left,(t(o).height()||o.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top],void 0):n.containment.constructor===Array?(this.containment=n.containment,void 0):("parent"===n.containment&&(n.containment=this.helper[0].parentNode),i=t(n.containment),s=i[0],s&&(e=/(scroll|auto)/.test(i.css("overflow")),this.containment=[(parseInt(i.css("borderLeftWidth"),10)||0)+(parseInt(i.css("paddingLeft"),10)||0),(parseInt(i.css("borderTopWidth"),10)||0)+(parseInt(i.css("paddingTop"),10)||0),(e?Math.max(s.scrollWidth,s.offsetWidth):s.offsetWidth)-(parseInt(i.css("borderRightWidth"),10)||0)-(parseInt(i.css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left-this.margins.right,(e?Math.max(s.scrollHeight,s.offsetHeight):s.offsetHeight)-(parseInt(i.css("borderBottomWidth"),10)||0)-(parseInt(i.css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top-this.margins.bottom],this.relativeContainer=i),void 0):(this.containment=null,void 0)},_convertPositionTo:function(t,e){e||(e=this.position);var i="absolute"===t?1:-1,s=this._isRootNode(this.scrollParent[0]);return{top:e.top+this.offset.relative.top*i+this.offset.parent.top*i-("fixed"===this.cssPosition?-this.offset.scroll.top:s?0:this.offset.scroll.top)*i,left:e.left+this.offset.relative.left*i+this.offset.parent.left*i-("fixed"===this.cssPosition?-this.offset.scroll.left:s?0:this.offset.scroll.left)*i}},_generatePosition:function(t,e){var i,s,n,o,a=this.options,r=this._isRootNode(this.scrollParent[0]),l=t.pageX,h=t.pageY;return r&&this.offset.scroll||(this.offset.scroll={top:this.scrollParent.scrollTop(),left:this.scrollParent.scrollLeft()}),e&&(this.containment&&(this.relativeContainer?(s=this.relativeContainer.offset(),i=[this.containment[0]+s.left,this.containment[1]+s.top,this.containment[2]+s.left,this.containment[3]+s.top]):i=this.containment,t.pageX-this.offset.click.left<i[0]&&(l=i[0]+this.offset.click.left),t.pageY-this.offset.click.top<i[1]&&(h=i[1]+this.offset.click.top),t.pageX-this.offset.click.left>i[2]&&(l=i[2]+this.offset.click.left),t.pageY-this.offset.click.top>i[3]&&(h=i[3]+this.offset.click.top)),a.grid&&(n=a.grid[1]?this.originalPageY+Math.round((h-this.originalPageY)/a.grid[1])*a.grid[1]:this.originalPageY,h=i?n-this.offset.click.top>=i[1]||n-this.offset.click.top>i[3]?n:n-this.offset.click.top>=i[1]?n-a.grid[1]:n+a.grid[1]:n,o=a.grid[0]?this.originalPageX+Math.round((l-this.originalPageX)/a.grid[0])*a.grid[0]:this.originalPageX,l=i?o-this.offset.click.left>=i[0]||o-this.offset.click.left>i[2]?o:o-this.offset.click.left>=i[0]?o-a.grid[0]:o+a.grid[0]:o),"y"===a.axis&&(l=this.originalPageX),"x"===a.axis&&(h=this.originalPageY)),{top:h-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+("fixed"===this.cssPosition?-this.offset.scroll.top:r?0:this.offset.scroll.top),left:l-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+("fixed"===this.cssPosition?-this.offset.scroll.left:r?0:this.offset.scroll.left)}},_clear:function(){this._removeClass(this.helper,"ui-draggable-dragging"),this.helper[0]===this.element[0]||this.cancelHelperRemoval||this.helper.remove(),this.helper=null,this.cancelHelperRemoval=!1,this.destroyOnClear&&this.destroy()},_trigger:function(e,i,s){return s=s||this._uiHash(),t.ui.plugin.call(this,e,[i,s,this],!0),/^(drag|start|stop)/.test(e)&&(this.positionAbs=this._convertPositionTo("absolute"),s.offset=this.positionAbs),t.Widget.prototype._trigger.call(this,e,i,s)},plugins:{},_uiHash:function(){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs}}}),t.ui.plugin.add("draggable","connectToSortable",{start:function(e,i,s){var n=t.extend({},i,{item:s.element});s.sortables=[],t(s.options.connectToSortable).each(function(){var i=t(this).sortable("instance");i&&!i.options.disabled&&(s.sortables.push(i),i.refreshPositions(),i._trigger("activate",e,n))})},stop:function(e,i,s){var n=t.extend({},i,{item:s.element});s.cancelHelperRemoval=!1,t.each(s.sortables,function(){var t=this;t.isOver?(t.isOver=0,s.cancelHelperRemoval=!0,t.cancelHelperRemoval=!1,t._storedCSS={position:t.placeholder.css("position"),top:t.placeholder.css("top"),left:t.placeholder.css("left")},t._mouseStop(e),t.options.helper=t.options._helper):(t.cancelHelperRemoval=!0,t._trigger("deactivate",e,n))})},drag:function(e,i,s){t.each(s.sortables,function(){var n=!1,o=this;o.positionAbs=s.positionAbs,o.helperProportions=s.helperProportions,o.offset.click=s.offset.click,o._intersectsWith(o.containerCache)&&(n=!0,t.each(s.sortables,function(){return this.positionAbs=s.positionAbs,this.helperProportions=s.helperProportions,this.offset.click=s.offset.click,this!==o&&this._intersectsWith(this.containerCache)&&t.contains(o.element[0],this.element[0])&&(n=!1),n})),n?(o.isOver||(o.isOver=1,s._parent=i.helper.parent(),o.currentItem=i.helper.appendTo(o.element).data("ui-sortable-item",!0),o.options._helper=o.options.helper,o.options.helper=function(){return i.helper[0]},e.target=o.currentItem[0],o._mouseCapture(e,!0),o._mouseStart(e,!0,!0),o.offset.click.top=s.offset.click.top,o.offset.click.left=s.offset.click.left,o.offset.parent.left-=s.offset.parent.left-o.offset.parent.left,o.offset.parent.top-=s.offset.parent.top-o.offset.parent.top,s._trigger("toSortable",e),s.dropped=o.element,t.each(s.sortables,function(){this.refreshPositions()}),s.currentItem=s.element,o.fromOutside=s),o.currentItem&&(o._mouseDrag(e),i.position=o.position)):o.isOver&&(o.isOver=0,o.cancelHelperRemoval=!0,o.options._revert=o.options.revert,o.options.revert=!1,o._trigger("out",e,o._uiHash(o)),o._mouseStop(e,!0),o.options.revert=o.options._revert,o.options.helper=o.options._helper,o.placeholder&&o.placeholder.remove(),i.helper.appendTo(s._parent),s._refreshOffsets(e),i.position=s._generatePosition(e,!0),s._trigger("fromSortable",e),s.dropped=!1,t.each(s.sortables,function(){this.refreshPositions()}))})}}),t.ui.plugin.add("draggable","cursor",{start:function(e,i,s){var n=t("body"),o=s.options;n.css("cursor")&&(o._cursor=n.css("cursor")),n.css("cursor",o.cursor)},stop:function(e,i,s){var n=s.options;n._cursor&&t("body").css("cursor",n._cursor)}}),t.ui.plugin.add("draggable","opacity",{start:function(e,i,s){var n=t(i.helper),o=s.options;n.css("opacity")&&(o._opacity=n.css("opacity")),n.css("opacity",o.opacity)},stop:function(e,i,s){var n=s.options;n._opacity&&t(i.helper).css("opacity",n._opacity)}}),t.ui.plugin.add("draggable","scroll",{start:function(t,e,i){i.scrollParentNotHidden||(i.scrollParentNotHidden=i.helper.scrollParent(!1)),i.scrollParentNotHidden[0]!==i.document[0]&&"HTML"!==i.scrollParentNotHidden[0].tagName&&(i.overflowOffset=i.scrollParentNotHidden.offset())},drag:function(e,i,s){var n=s.options,o=!1,a=s.scrollParentNotHidden[0],r=s.document[0];a!==r&&"HTML"!==a.tagName?(n.axis&&"x"===n.axis||(s.overflowOffset.top+a.offsetHeight-e.pageY<n.scrollSensitivity?a.scrollTop=o=a.scrollTop+n.scrollSpeed:e.pageY-s.overflowOffset.top<n.scrollSensitivity&&(a.scrollTop=o=a.scrollTop-n.scrollSpeed)),n.axis&&"y"===n.axis||(s.overflowOffset.left+a.offsetWidth-e.pageX<n.scrollSensitivity?a.scrollLeft=o=a.scrollLeft+n.scrollSpeed:e.pageX-s.overflowOffset.left<n.scrollSensitivity&&(a.scrollLeft=o=a.scrollLeft-n.scrollSpeed))):(n.axis&&"x"===n.axis||(e.pageY-t(r).scrollTop()<n.scrollSensitivity?o=t(r).scrollTop(t(r).scrollTop()-n.scrollSpeed):t(window).height()-(e.pageY-t(r).scrollTop())<n.scrollSensitivity&&(o=t(r).scrollTop(t(r).scrollTop()+n.scrollSpeed))),n.axis&&"y"===n.axis||(e.pageX-t(r).scrollLeft()<n.scrollSensitivity?o=t(r).scrollLeft(t(r).scrollLeft()-n.scrollSpeed):t(window).width()-(e.pageX-t(r).scrollLeft())<n.scrollSensitivity&&(o=t(r).scrollLeft(t(r).scrollLeft()+n.scrollSpeed)))),o!==!1&&t.ui.ddmanager&&!n.dropBehaviour&&t.ui.ddmanager.prepareOffsets(s,e)}}),t.ui.plugin.add("draggable","snap",{start:function(e,i,s){var n=s.options;s.snapElements=[],t(n.snap.constructor!==String?n.snap.items||":data(ui-draggable)":n.snap).each(function(){var e=t(this),i=e.offset();this!==s.element[0]&&s.snapElements.push({item:this,width:e.outerWidth(),height:e.outerHeight(),top:i.top,left:i.left})})},drag:function(e,i,s){var n,o,a,r,l,h,c,u,d,p,f=s.options,g=f.snapTolerance,m=i.offset.left,_=m+s.helperProportions.width,v=i.offset.top,b=v+s.helperProportions.height;for(d=s.snapElements.length-1;d>=0;d--)l=s.snapElements[d].left-s.margins.left,h=l+s.snapElements[d].width,c=s.snapElements[d].top-s.margins.top,u=c+s.snapElements[d].height,l-g>_||m>h+g||c-g>b||v>u+g||!t.contains(s.snapElements[d].item.ownerDocument,s.snapElements[d].item)?(s.snapElements[d].snapping&&s.options.snap.release&&s.options.snap.release.call(s.element,e,t.extend(s._uiHash(),{snapItem:s.snapElements[d].item})),s.snapElements[d].snapping=!1):("inner"!==f.snapMode&&(n=g>=Math.abs(c-b),o=g>=Math.abs(u-v),a=g>=Math.abs(l-_),r=g>=Math.abs(h-m),n&&(i.position.top=s._convertPositionTo("relative",{top:c-s.helperProportions.height,left:0}).top),o&&(i.position.top=s._convertPositionTo("relative",{top:u,left:0}).top),a&&(i.position.left=s._convertPositionTo("relative",{top:0,left:l-s.helperProportions.width}).left),r&&(i.position.left=s._convertPositionTo("relative",{top:0,left:h}).left)),p=n||o||a||r,"outer"!==f.snapMode&&(n=g>=Math.abs(c-v),o=g>=Math.abs(u-b),a=g>=Math.abs(l-m),r=g>=Math.abs(h-_),n&&(i.position.top=s._convertPositionTo("relative",{top:c,left:0}).top),o&&(i.position.top=s._convertPositionTo("relative",{top:u-s.helperProportions.height,left:0}).top),a&&(i.position.left=s._convertPositionTo("relative",{top:0,left:l}).left),r&&(i.position.left=s._convertPositionTo("relative",{top:0,left:h-s.helperProportions.width}).left)),!s.snapElements[d].snapping&&(n||o||a||r||p)&&s.options.snap.snap&&s.options.snap.snap.call(s.element,e,t.extend(s._uiHash(),{snapItem:s.snapElements[d].item})),s.snapElements[d].snapping=n||o||a||r||p)}}),t.ui.plugin.add("draggable","stack",{start:function(e,i,s){var n,o=s.options,a=t.makeArray(t(o.stack)).sort(function(e,i){return(parseInt(t(e).css("zIndex"),10)||0)-(parseInt(t(i).css("zIndex"),10)||0)});a.length&&(n=parseInt(t(a[0]).css("zIndex"),10)||0,t(a).each(function(e){t(this).css("zIndex",n+e)}),this.css("zIndex",n+a.length))}}),t.ui.plugin.add("draggable","zIndex",{start:function(e,i,s){var n=t(i.helper),o=s.options;n.css("zIndex")&&(o._zIndex=n.css("zIndex")),n.css("zIndex",o.zIndex)},stop:function(e,i,s){var n=s.options;n._zIndex&&t(i.helper).css("zIndex",n._zIndex)}}),t.ui.draggable});

check();
//Cookies.remove(id_cookie_periodo);