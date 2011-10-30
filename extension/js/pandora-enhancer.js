/***
* PandoraEnhancer
* by Brandon Sachs and Curt Hostetter
*/

//TODO: on audio ad detection, mute the player (good suggestion from one of our reviews on the web store, haha)

//init
chrome.extension.sendRequest({
    notificationType: 'showPageAction'
}, function(response) { /* json */ });

//player control listener
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
    debugLog(request);
    var action = request.playerControl;
    playerControl(action);
});

//settings
var settings = {
    background_image:   'http://www.pandora.com/static/valances/pandora/default/skin_background.jpg',
    background_color:   '#09102a'
};

//request localStorage settings
chrome.extension.sendRequest({
    notificationType: 'getLocalStorage',
}, function(response){
    settings.pe = response.message;
});

var oldAlbumArt = null;
var newAlbumArt = null;
var ads_hidden = 0;
var song_skip_tries = 0;
var restoredVolumeLevel;

//show volume slider always. so annoying.
jQuery(".volumeBackground").css("display","block !important");

var playerControl = function(action)
{
    debugLog("player control function - action: " + action);
    switch (action)
    {
        case "thumbs_up":
            dispatchClick(jQuery('.thumbUpButton')[0]);
            debugLog("PandoraEnhancer - Thumbs up, dude!");
            break;
        case "thumbs_down":
            dispatchClick(jQuery('.thumbDownButton')[0]);
            debugLog("PandoraEnhancer - Thumbs down :-(");
            break;
        case "play":
            dispatchClick(jQuery('.playButton')[0]);
            debugLog("PandoraEnhancer - Play");
            break;
        case "pause":
            dispatchClick(jQuery('.pauseButton')[0]);
            debugLog("PandoraEnhancer - Pause");
            break;
        case "skip":
            dispatchClick(jQuery('.skipButton')[0]);
            debugLog("PandoraEnhancer - Skip");
            break;
        
        //TODO: make mute/unmute work
        case "mute":
            /*
            //THIS REQUIRES TAB PERMISSIONS - i'd like to do it without requiring those
            //"tabs", "http://*.pandora.com/*", "https://*.pandora.com/*"
            mute = { code: "window.location = 'http://www.pandora.com/#/volume/0'" }
            chrome.tabs.executeScript(tabID, mute, function(){
                console.log("muted - background.html");
            });
            */
            
            //.volumeKnob left property
            //35px = volume 0
            //117px = volume 100
            
            
            if (jQuery(".volumeKnob").css("left") == "35px") return false;
            
            restoredVolumeLevel = jQuery(".volumeKnob").css("left");
            
            //jQuery(".volumeKnob").css("left", "35px");
            
            //the click sets the volume to 0. every time. hmmmmm, need to find out how to make pandora recognize the vol changed
            dispatchClick(jQuery(".volumeKnob")[0]);
            
            debugLog("PandoraEnhancer - Mute");            
            break;
        case "unmute":
            //debugLog("volume is muted - lets unmute it! - restoring to " + restoredVolumeLevel);
            jQuery(".volumeKnob").css("left", ""+restoredVolumeLevel+"");
            
            setTimeout(function(){
                //the click sets the volume to 0. every time.
                dispatchClick(jQuery(".volumeKnob")[0]);
            },1000);
            
            debugLog("PandoraEnhancer - Un-mute");
            break;
            
        default:
            return false;
            break;
    }
};

var debugLog = function(text)
{
    if(settings.pe.debug_mode == "false") return;
    console.log(text);
};

var dispatchClick = function(selector){
    var subject = selector;
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    subject.dispatchEvent(event);
};

var hideAds = function()
{
    jQuery("body").css("background-color", "none !important");
    jQuery("#mainContainer").css({"background-image":settings.background_image + " !important", "background-color":settings.background_color});
    jQuery("#mainContentContainer").css("float", "none !important");
    ads_hidden++;
};

var hideVideoAd = function()
{
    //this removes the ad window, but does NOT resume playing music automatically. it takes a few seconds
    chrome.extension.sendRequest({
        notificationType: 'hideVideoAd'
    }, function(response){
        jQuery("#videoPlayerContainer").addClass("hideVideoAd").remove();
        debugLog("PandoraEnhancer - Removing video ad.");
    });
};

var hideRibbon = function(){
    debugLog("PandoraEnhancer - Hiding ribbon.");
    dispatchClick(jQuery('.account_message_close > a')[0]);
};

var extendStationList = function()
{
    debugLog("PandoraEnhancer - Fixing station list.");
    jQuery('#promobox').remove();
    jQuery('.platformPromo').remove();
    jQuery('.stationListHolder').css('height', '740px !important');
    jQuery('.stationContent').css('height', '100% !important');
    jQuery('.jspContainer').css('height', '100% !important');

};

var selectableLyrics = function()
{
    //lol they went above and beyond to prevent this. so strange.
    if(jQuery("#PE-copyLyrics").length == 0)
        {
        jQuery(".item.lyrics > .heading").append(
        '<span id="PE-copyLyrics"> - Copy Lyrics to Clipboard</span>'
        ).css({
            cursor: "pointer"
        });
    }

    jQuery(".lyricsText").attr(
    {
        unselectable:   "on",
        onmousedown:    "return true;",
        onclick:        "return true;",
        ondragstart:    "return true;",
        onselectstart:  "return true;",
        onmouseover:    "return true;"
    }).css(
    {
        "-moz-user-select": "auto !important",
        "cursor":           "auto !important"
    }).removeClass("unselectable");    
    debugLog("PandoraEnhancer - Lyrics selectable.");
};

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not just hidden
    dispatchClick(jQuery('.showMoreLyrics')[0]);

    //i really don't like how this is implemented. find the event that fires after it receives the lyrics.        
    setTimeout(function(){
        //this preserves line breaks
        var lyrics = jQuery(".lyricsText").html().replace(/(<br>)|(<br \/>)|(<p>)|(<\/p>)/g, "\r\n");
        lyrics += "\nCopied by PandoraEnhancer for Chrome";

        chrome.extension.sendRequest({
            copyLyrics: true,
            lyricText: lyrics
        }, function(response){
            if (response.status == "true"){
                alert("Lyrics copied to clipboard!");
            } else {
                alert("Could not copy lyrics...");
            }
        });
    },1000);
};

var totallyStillListening = function()
{
    debugLog("PandoraEnhancer - Still listening bypass.");
    dispatchClick(jQuery('.still_listening')[0]);
};

var doSongChange = function()
{
    var currentAlbumArt = jQuery(".playerBarArt")[0];  

    if(currentAlbumArt != null)
    {
        oldAlbumArt = jQuery(currentAlbumArt).attr("src"); 
    }

    if(currentAlbumArt == null || oldAlbumArt == newAlbumArt)
    {
        if(song_skip_tries < 5)
        {
            song_skip_tries++;
            setTimeout("doSongChange()", 100); //try again in 1/10 of second.
        }
        return;
    }

    debugLog('PandoraEnhancer - Song changed.');

    song_skip_tries = 0;
    setTimeout("showNewSongPopup()", 100);
};

var showNewSongPopup = function()
{
    newAlbumArt = oldAlbumArt;

    //idunno if it matters, but i prefer artist - song (album) //setting?
    var artistName  = jQuery(".playerBarArtist")[0].textContent,
    songName		= jQuery(".playerBarSong")[0].textContent,
    albumName		= jQuery(".playerBarAlbum")[0].textContent;

    if (songName == "ad")
    {
        hideVideoAd();
        return false;
    }
    
    if (songName == "audioad")
    {
        debugLog("PandoraEnhancer - Can't do anything about audio ads. Enjoy!");
    }

    chrome.extension.sendRequest({
        notificationType: 'songChange',
        notificationParams: {
            albumArt:   oldAlbumArt,
            artistName: artistName,
            songName:   songName,
            albumName:  albumName
        }
    }, function(response) {});

};

var showStillListeningNotification = function()
{
    chrome.extension.sendRequest({
        notificationType: 'stillListening',
        notificationParams: {}
    }, 
    function(response){});
};

var appendHeaderConfig = function()
{
    debugLog("PandoraEnhancer - Appending configure link to header.");
    jQuery(".stationChangeSelectorNoMenu").css({"width":"auto !important", "margin-left":"-65px"});
    jQuery("#brandingBar > .middlecolumn").append("<span id='PE-config-link'>Configure PandoraEnhancer</span>");
    jQuery("#brandingBar .rightcolumn").css("width","auto");
    jQuery("#PE-config-link").css({"cursor":"pointer"});
};


jQuery(document).ready(function()
{    
    debugLog("PandoraEnhancer loaded.");

    if(settings.pe.remove_promobox != "false")
        {
        jQuery("#promobox").live('DOMNodeInserted', function(){
            extendStationList();
        });
    }

    jQuery("#PE-config-link").live('click', function(){
        chrome.extension.sendRequest({
            showSettings: true
        }, function(response){});
    });

    //TODO - click volume button to mute
    jQuery(".volumeButton").live('click', function(){
        chrome.extension.sendRequest({
            playerControl: "mute"
        }, function(response){});
    });


    if(settings.pe.remove_ribbon != "false")
        {
        jQuery(".pandoraRibbonContainer, .ribbonContent").live('DOMNodeInserted', function(){
            hideRibbon();
        });
    }

    if(settings.pe.header_config != "false")
        {
        jQuery(".stationChangeSelectorNoMenu").livequery(function(){
            appendHeaderConfig();
        });
    }

    if(settings.pe.notification_song_change != "false")
        {
        jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
            doSongChange();
        });
    }

    if(settings.pe.notification_still_listening != "false")
        {
        jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
            if(jQuery('.still_listening').length > 0)
                {
                showStillListeningNotification();
                setTimeout("totallyStillListening()", 5000);
            }
        });
    }

    if(settings.pe.remove_ads != "false")
        {
        jQuery("#mainContentContainer, #mainContainer").livequery(function(){
            hideAds();
        });

        jQuery("#ad_container, #ad_frame, #adContainer, #videoPageInfo, .contextual_help_container").livequery(function(){
            jQuery(this).remove();
            ads_hidden++;
        });

        hideAds();
    }

    if(settings.pe.selectable_lyrics != "false")
        {
        jQuery(".lyricsText").livequery(function(){
            selectableLyrics();
        });

        jQuery("#PE-copyLyrics").live('click', function(){        
            copyLyricsToClipboard();
        });
    }

    if(settings.pe.remove_videos != "false")
        {
        jQuery("#videoPlayerContainer, #videoPlayer").live('DOMNodeInserted change', function(event){
            (ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
        }).livequery(function(){
            debugLog("video ad blocked via LQ")
            (ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
        });
    }
});