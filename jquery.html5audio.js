//
//
// HTML5 Audio Player jQuery Plugin
// --------------------------------
//
// Feature-complete, modular HTML5 audio player with Flash fallback player. Two
// different player classes allows for more flexibility. Fallback-testing supports
// Modernizr. Tries to be UI-agnostic. Players support play, stop, volume-setting,
// and looping. Public methods are chainable.
//
// Requires:
//
// - jQuery 1.7+ / Zepto 1.0+ (+data)
// - SWFObject 2.0+
//
// ---
//
//     Copyright (c) 2012-present useallfive.com
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy of
//     this software and associated documentation files (the "Software"), to deal in
//     the Software without restriction, including without limitation the rights to
//     use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
//     the Software, and to permit persons to whom the Software is furnished to do so,
//     subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
//     copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
//     FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
//     COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
//     IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
//     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
//
/*global jQuery, Zepto, swfobject, Modernizr */
;(function($){
  //-- Boilerplate.
  "use strict";
  $.ua5 = $.ua5 || {
    dev: {
      log: false
    }
  };
  var toString = Object.prototype.toString,
      log = $.ua5.dev.log ? function () {
        if ( console.log ) { console.log.apply(console, arguments); }
      } : $.noop;
  /** classes */ //-- Section marker comment.
  function createAudioPlayer ($root, opts) {
    //-- Top-level player methods are mostly just wrappers.
    /** private */
    var _player;
    function _createHTMLPlayer (opts) {
      /** _private */
      var __player,
          __curr_playing_sound,
          __muted = false,
          __sounds = [];
      function __mute () {
        $.each(__sounds, function(idx, snd) {
          snd.player.volume = 0;
        });
      }
      function __initMuting ($mute_toggle) {
        var is_a = $mute_toggle.is('a');
        $mute_toggle.on('click', function(e) {
          var vol = __muted ? 0 : 100,
              snd = __findSound(__curr_playing_sound);
          __muted = (100 == $mute_toggle.data('audioPlayerVolume'));
          $mute_toggle
            .data('audioPlayerVolume', vol)
            .attr('data-audio-player-volume', vol);
          __mute();
          if ( !__muted && null != snd ) {
            snd.player.volume = 1;
          }
          if ( is_a ) {
            e.preventDefault();
            return false;
          }
        });
      }
      function __onSoundEnd (e) {
        __play(__curr_playing_sound);
      }
      function __findSound (name, onSuccess, onFailure) {
        var snd, i;
        for ( i = 0; i < __sounds.length; i++ ) {
          snd = __sounds[i];
          if ( name == snd.name ) {
            if ( '[object Function]' == toString.call(onSuccess) && null != snd ) {
              onSuccess.call(snd, snd.player);
            } else if ( '[object Function]' == toString.call(onFailure) && null == snd ) {
              onFailure();
            }
            return snd;
          }
        }
        if ( '[object Function]' == toString.call(onFailure) ) {
          onFailure();
        }
        return false;
      }
      /* /_private **/
      /** _public */
      //-- Callback convention is to have the sound object be the context and its
      //   `player` / element be the first argument.
      function __preload (name, url, onLoad, onPreload) {
        __findSound(name, onLoad, function() {
          var $player = $('<audio>').appendTo(opts.$asset_container||$root),
              snd = {
                name: name,
                player: $player.get(0),
                loop_position: opts.loop_count
              };
          if ( opts.loop ) {
            snd.player.addEventListener('ended', __onSoundEnd, false);
          }
          $player.data('src', url);
          $.each(opts.extensions, function(idx, ext){
            var type;
            if ( 'mp3' === ext ) {
              type = 'audio/mpeg;codecs=mp3';
            } else if ( 'ogg' == ext ) {
              type = 'audio/ogg;codecs=vorbis';
            }
            $('<source>')
              .attr({
                src: url+'.'+ext,
                type: type
              })
              .appendTo($player);
          });
          snd.player.addEventListener('canplay', function(e) {
            if ( '[object Function]' == toString.call(onLoad) ) {
              __sounds.push(snd);
              onLoad.call(snd, snd.player);
            }
          });
          if ( '[object Function]' == toString.call(onPreload) ) {
            onPreload.call(snd, snd.player);
          }
          snd.player.load();
        });
      }
      function __play (name, onPlay) {
        __findSound(name, function(player) {
          log('playing');
          if ( opts.solo && null != __curr_playing_sound ) {
            //-- Skipping OGG playback in FF.
            __stop(__curr_playing_sound, $.browser.mozilla);
          }
          if ( opts.loop ) {
            if ( 0 === this.loop_position ) {
              log('loop ended');
              this.loop_position = opts.loop_count;
            } else if ( isFinite(this.loop_position) ) {
              log('looped');
              this.loop_position -= 1;
            }
            //-- Workaround for currentTime not being writeable in some domain setups.
            (function(){
              var old_player = player,
                  src = old_player.getAttribute('src');
              if ( null == src ) {
                src = $(old_player).data('src')+'.'+
                  ($.browser.mozilla ? 'ogg' : 'mp3');
              }
              if ( player.currentTime === player.duration ) {
                log('looping', __curr_playing_sound);
                $(player).off();
                this.player = player = null;
                this.player = player = new Audio(src);
                player.addEventListener('ended', __onSoundEnd, false);
              }
            }.call(this));
          } else {
            //-- Have this bubble so any UI can update.
            player.addEventListener('ended', function() {
              $(player).trigger('end');
            }, true);
          }
          player.play();
          __curr_playing_sound = name;
          if ( '[object Function]' == toString.call(onPlay) ) {
            onPlay.call(this, this.player);
          }
        });
      }
      function __stop (name, pause, onStop) {
        if ( null == pause ) {
          pause = false;
        }
        __findSound(name, function(player) {
          log('pausing');
          if ( !pause && player.startTime ) {
            log('stopping');
            player.currentTime = player.startTime;
          }
          player.pause();
          __curr_playing_sound = null;
          if ( '[object Function]' == toString.call(onStop) ) {
            onStop.call(this, player);
          }
        });
      }
      function __volume (name, vol) {
        __findSound(name, function(player) {
          player.volume = __muted ? 0 : (vol / 100).toFix(2);
        });
      }
      function __init () {
        if ( opts.$mute_toggle ) {
          __initMuting(opts.$mute_toggle);
        }
      }
      return {
        init:     __init,
        play:     __play,
        preload:  __preload,
        stop:     __stop,
        volume:   __volume
      };
      /* /_public **/
    }
    function _createFlashPlayer (opts) {
      /** _private */
      var __player_obj,
          __curr_playing_sound,
          __muted = false,
          __curr_volume = 0,
          __sounds = [];
      function __swf () {
        //-- Getter only.
        if ( !__player_obj ) {
          __player_obj = swfobject.getObjectById(opts.swf_id);
        }
        return __player_obj;
      }
      function __initMuting ($mute_toggle) {
        var is_a = $mute_toggle.is('a');
        $mute_toggle.on('click', function(e) {
          var vol = __muted ? 0 : 100;
          __muted = (100 == $mute_toggle.data('audioPlayerVolume'));
          $mute_toggle
            .data('audioPlayerVolume', vol)
            .attr('data-audio-player-volume', vol);
          if ( is_a ) {
            e.preventDefault();
            return false;
          }
        });
      }
      function __mute () {
        $.each(__sounds, function(idx, name) {
          __swf().volume(name, __mute ? 0 : 100);
        });
      }
      /* /_private **/
      /** _public */
      function __preload (name, url) {
        var o = document.createElement('object');
        o.data = url;
        o.width = o.height = 0;
        (opts.$asset_container||$root).append(o);
        __swf().preload(name, url, opts.loop, 'log');
        __sounds.push(name);
      }
      function __play (name) {
        if ( opts.solo && null != __curr_playing_sound ) {
          __stop(__curr_playing_sound);
        }
        __swf().play(name, 'log');
      }
      function __stop (name) {
        __swf().stop(name, 'log');
      }
      function __volume (name, value) {
        if ( __muted ) {
          value = 0;
        }
        __swf().volume(name, value, 'log');
      }
      function __init () {
        swfobject.embedSWF(opts.swf_url, opts.container_id,
          '1', '1', '10.0.0', 'expressInstall.swf',
          opts.flash_vars, opts.params, {
            id: opts.swf_id,
            name: opts.swf_id
          });
        if ( opts.$mute_toggle ) {
          __initMuting(opts.$mute_toggle);
        }
      }
      return {
        init:     __init,
        play:     __play,
        preload:  __preload,
        stop:     __stop,
        volume:   __volume
      };
      /* /_public **/
    }
    function _mute ()    { _player.mute.apply(_player, arguments); }
    /* /private **/
    /** public */
    function _volume ()  { _player.volume.apply(_player, arguments);  return this; }
    function _stop ()    { _player.stop.apply(_player, arguments);    return this; }
    function _preload () { _player.preload.apply(_player, arguments); return this; }
    function _play ()    { _player.play.apply(_player, arguments);    return this; }
    function _init () {
      var uid, $container;
      //-- Update options.
      if ( opts.mute_toggle_selector ) {
        opts.$mute_toggle = $(opts.mute_toggle_selector);
      }
      if ( opts.asset_container_selector ) {
        opts.$asset_container = $(opts.asset_container_selector);
      }
      opts.shared.loop *= 1; //-- Numeric type for legacy flash script support.
      //-- Detected and create player.
      if ( (window.Modernizr && Modernizr.audio) ||
           jQuery.browser.webkit ) {
        _player = _createHTMLPlayer($.extend(true, {}, opts.html_player, opts.shared));
      } else {
        //-- Update more options.
        uid = 'audio_preloader_' + (new Date()).getTime();
        if ( !opts.flash_player.swf_id ) {
          //-- Generate default unique `swf_id`.
          opts.flash_player.swf_id = uid;
        }
        if ( !opts.flash_player.container_id && null == $root.attr('id') ) {
          //-- Generate default unique `container_id`.
          opts.flash_player.container_id = uid;
          $container = $root.find('.flash-audio-preloader:eq(0)');
          if ( !$container.length ) {
            $container = $('<div class="flash-audio-preloader">').appendTo($root);
          }
          $container.attr('id', opts.flash_player.container_id);
        }
        _player = _createFlashPlayer($.extend(true, {}, opts.flash_player, opts.shared));
      }
      _player.init.apply(_player, arguments);
      return this;
    }
    return {
      init:     _init,
      play:     _play,
      preload:  _preload,
      stop:     _stop,
      volume:   _volume
    };
    /* /public **/
  }
  $.ua5.createAudioPlayer = createAudioPlayer;
  /* /classes **/
  /** plugin method */
  $.fn.audioPlayer = function(opts){
    //-- Try returning existing plugin api if no options are passed in.
    var api = this.eq(0).data('audioPlayer');
    if ( null != api ) { return api; }
    //-- Re-apply plugin.
    opts = $.extend(true, {}, $.fn.audioPlayer.defaults, opts);
    return this.each(function(){
      var $root = $(this);
      $root.data('audioPlayer', createAudioPlayer($root, opts));
    });
  };
  /* /plugin method **/
  /** options */
  $.fn.audioPlayer.defaults = {
    mute_toggle_selector: null,
    asset_container_selector: null,
    shared: {
      //-- Gets merged into player-specific options.
      solo: true,
      loop: true,
      loop_count: Infinity
    },
    html_player: {
      preload: $.noop,
      extensions: ['mp3', 'ogg']
    },
    flash_player: {
      swf_url: 'html5audio-multitrack-preloader.swf',
      swf_id: null,
      container_id: null,
      flash_vars: {
        //-- Conventional property names.
        flashReadyCallback: $.noop
      },
      params: {
        //-- Conventional property names.
        wmode: 'transparent'
      }
    }
  };
  /* /options **/
}(window.jQuery||window.Zepto));