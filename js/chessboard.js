/*! chessboard.js v1.0.0 | (c) 2019 Chris Oakman | MIT License chessboardjs.com/license */
!(function () {
  "use strict";
  var z = window.jQuery,
    F = "abcdefgh".split(""),
    r = 20,
    A = "…",
    W = "1.8.3",
    e = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
    G = pe(e),
    n = 200,
    t = 200,
    o = 60,
    a = 30,
    i = 100,
    H = {};
  function V(e, r, n) {
    function t() {
      (o = 0), a && ((a = !1), s());
    }
    var o = 0,
      a = !1,
      i = [],
      s = function () {
        (o = window.setTimeout(t, r)), e.apply(n, i);
      };
    return function (e) {
      (i = arguments), o ? (a = !0) : s();
    };
  }
  function Z() {
    return "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx".replace(
      /x/g,
      function (e) {
        return ((16 * Math.random()) | 0).toString(16);
      }
    );
  }
  function _(e) {
    return JSON.parse(JSON.stringify(e));
  }
  function s(e) {
    var r = e.split(".");
    return {
      major: parseInt(r[0], 10),
      minor: parseInt(r[1], 10),
      patch: parseInt(r[2], 10),
    };
  }
  function ee(e, r) {
    for (var n in r)
      if (r.hasOwnProperty(n))
        for (var t = "{" + n + "}", o = r[n]; -1 !== e.indexOf(t); )
          e = e.replace(t, o);
    return e;
  }
  function re(e) {
    return "string" == typeof e;
  }
  function ne(e) {
    return "function" == typeof e;
  }
  function p(e) {
    return "number" == typeof e && isFinite(e) && Math.floor(e) === e;
  }
  function c(e) {
    return "fast" === e || "slow" === e || (!!p(e) && 0 <= e);
  }
  function te(e) {
    if (!re(e)) return !1;
    var r = e.split("-");
    return 2 === r.length && oe(r[0]) && oe(r[1]);
  }
  function oe(e) {
    return re(e) && -1 !== e.search(/^[a-h][1-8]$/);
  }
  function u(e) {
    return re(e) && -1 !== e.search(/^[bw][KQRNBP]$/);
  }
  function ae(e) {
    if (!re(e)) return !1;
    var r = (e = (function (e) {
      return e
        .replace(/8/g, "11111111")
        .replace(/7/g, "1111111")
        .replace(/6/g, "111111")
        .replace(/5/g, "11111")
        .replace(/4/g, "1111")
        .replace(/3/g, "111")
        .replace(/2/g, "11");
    })((e = e.replace(/ .+$/, "")))).split("/");
    if (8 !== r.length) return !1;
    for (var n = 0; n < 8; n++)
      if (8 !== r[n].length || -1 !== r[n].search(/[^kqrnbpKQRNBP1]/))
        return !1;
    return !0;
  }
  function ie(e) {
    if (!z.isPlainObject(e)) return !1;
    for (var r in e) if (e.hasOwnProperty(r) && (!oe(r) || !u(e[r]))) return !1;
    return !0;
  }
  function se() {
    return (
      typeof window.$ &&
      z.fn &&
      z.fn.jquery &&
      (function (e, r) {
        (e = s(e)), (r = s(r));
        var n = 1e5 * e.major * 1e5 + 1e5 * e.minor + e.patch;
        return 1e5 * r.major * 1e5 + 1e5 * r.minor + r.patch <= n;
      })(z.fn.jquery, W)
    );
  }
  function pe(e) {
    if (!ae(e)) return !1;
    for (
      var r, n = (e = e.replace(/ .+$/, "")).split("/"), t = {}, o = 8, a = 0;
      a < 8;
      a++
    ) {
      for (var i = n[a].split(""), s = 0, p = 0; p < i.length; p++) {
        if (-1 !== i[p].search(/[1-8]/)) s += parseInt(i[p], 10);
        else
          (t[F[s] + o] =
            (r = i[p]).toLowerCase() === r
              ? "b" + r.toUpperCase()
              : "w" + r.toUpperCase()),
            (s += 1);
      }
      o -= 1;
    }
    return t;
  }
  function ce(e) {
    if (!ie(e)) return !1;
    for (var r, n, t = "", o = 8, a = 0; a < 8; a++) {
      for (var i = 0; i < 8; i++) {
        var s = F[i] + o;
        e.hasOwnProperty(s)
          ? (t +=
              ((r = e[s]),
              (n = void 0),
              "w" === (n = r.split(""))[0]
                ? n[1].toUpperCase()
                : n[1].toLowerCase()))
          : (t += "1");
      }
      7 !== a && (t += "/"), (o -= 1);
    }
    return (t = (function (e) {
      return e
        .replace(/11111111/g, "8")
        .replace(/1111111/g, "7")
        .replace(/111111/g, "6")
        .replace(/11111/g, "5")
        .replace(/1111/g, "4")
        .replace(/111/g, "3")
        .replace(/11/g, "2");
    })(t));
  }
  function ue(e, r, n) {
    for (
      var t = (function (e) {
          for (var r = [], n = 0; n < 8; n++)
            for (var t = 0; t < 8; t++) {
              var o = F[n] + (t + 1);
              e !== o &&
                r.push({
                  square: o,
                  distance:
                    ((a = e),
                    (i = o),
                    void 0,
                    void 0,
                    void 0,
                    void 0,
                    void 0,
                    void 0,
                    void 0,
                    void 0,
                    (s = a.split("")),
                    (p = F.indexOf(s[0]) + 1),
                    (c = parseInt(s[1], 10)),
                    (u = i.split("")),
                    (f = F.indexOf(u[0]) + 1),
                    (d = parseInt(u[1], 10)),
                    (h = Math.abs(p - f)),
                    (l = Math.abs(c - d)),
                    l <= h ? h : l),
                });
            }
          var a, i, s, p, c, u, f, d, h, l;
          r.sort(function (e, r) {
            return e.distance - r.distance;
          });
          var v = [];
          for (n = 0; n < r.length; n++) v.push(r[n].square);
          return v;
        })(n),
        o = 0;
      o < t.length;
      o++
    ) {
      var a = t[o];
      if (e.hasOwnProperty(a) && e[a] === r) return a;
    }
    return !1;
  }
  function fe(e) {
    return (
      "black" !== e.orientation && (e.orientation = "white"),
      !1 !== e.showNotation && (e.showNotation = !0),
      !0 !== e.draggable && (e.draggable = !1),
      "trash" !== e.dropOffBoard && (e.dropOffBoard = "snapback"),
      !0 !== e.sparePieces && (e.sparePieces = !1),
      e.sparePieces && (e.draggable = !0),
      (e.hasOwnProperty("pieceTheme") &&
        (re(e.pieceTheme) || ne(e.pieceTheme))) ||
        (e.pieceTheme = "img/chesspieces/{piece}.png"),
      c(e.appearSpeed) || (e.appearSpeed = n),
      c(e.moveSpeed) || (e.moveSpeed = t),
      c(e.snapbackSpeed) || (e.snapbackSpeed = o),
      c(e.snapSpeed) || (e.snapSpeed = a),
      c(e.trashSpeed) || (e.trashSpeed = i),
      (function (e) {
        return p(e) && 1 <= e;
      })(e.dragThrottleRate) || (e.dragThrottleRate = r),
      e
    );
  }
  (H.alpha = "alpha-d2270"),
    (H.black = "black-3c85d"),
    (H.board = "board-b72b1"),
    (H.chessboard = "chessboard-63f37"),
    (H.clearfix = "clearfix-7da63"),
    (H.highlight1 = "highlight1-32417"),
    (H.highlight2 = "highlight2-9c5d2"),
    (H.notation = "notation-322f9"),
    (H.numeric = "numeric-fc462"),
    (H.piece = "piece-417db"),
    (H.row = "row-5277c"),
    (H.sparePieces = "spare-pieces-7492f"),
    (H.sparePiecesBottom = "spare-pieces-bottom-ae20f"),
    (H.sparePiecesTop = "spare-pieces-top-4028b"),
    (H.square = "square-55d63"),
    (H.white = "white-1e1d7"),
    (window.Chessboard = function (e, f) {
      if (
        !(function () {
          if (se()) return !0;
          var e =
            "Chessboard Error 1005: Unable to find a valid version of jQuery. Please include jQuery " +
            W +
            " or higher on the page\n\nExiting" +
            A;
          return window.alert(e), !1;
        })()
      )
        return null;
      var n = (function (e) {
        if ("" === e) {
          var r =
            "Chessboard Error 1001: The first argument to Chessboard() cannot be an empty string.\n\nExiting" +
            A;
          return window.alert(r), !1;
        }
        re(e) && "#" !== e.charAt(0) && (e = "#" + e);
        var n = z(e);
        if (1 === n.length) return n;
        var t =
          "Chessboard Error 1003: The first argument to Chessboard() must be the ID of a DOM node, an ID query selector, or a single DOM node.\n\nExiting" +
          A;
        return window.alert(t), !1;
      })(e);
      if (!n) return null;
      f = fe(
        (f = (function (e) {
          return (
            "start" === e
              ? (e = { position: _(G) })
              : ae(e)
              ? (e = { position: pe(e) })
              : ie(e) && (e = { position: _(e) }),
            z.isPlainObject(e) || (e = {}),
            e
          );
        })(f))
      );
      var r = null,
        a = null,
        t = null,
        o = null,
        i = {},
        s = 2,
        p = "white",
        c = {},
        u = null,
        d = null,
        h = null,
        l = !1,
        v = {},
        g = {},
        w = {},
        b = 16;
      function m(e, r, n) {
        if (!0 === f.hasOwnProperty("showErrors") && !1 !== f.showErrors) {
          var t = "Chessboard Error " + e + ": " + r;
          return "console" === f.showErrors &&
            "object" == typeof console &&
            "function" == typeof console.log
            ? (console.log(t), void (2 <= arguments.length && console.log(n)))
            : "alert" === f.showErrors
            ? (n && (t += "\n\n" + JSON.stringify(n)), void window.alert(t))
            : void (ne(f.showErrors) && f.showErrors(e, r, n));
        }
      }
      function P(e) {
        return ne(f.pieceTheme)
          ? f.pieceTheme(e)
          : re(f.pieceTheme)
          ? ee(f.pieceTheme, { piece: e })
          : (m(8272, "Unable to build image source for config.pieceTheme."),
            "");
      }
      function y(e, r, n) {
        var t = '<img src="' + P(e) + '" ';
        return (
          re(n) && "" !== n && (t += 'id="' + n + '" '),
          (t +=
            'alt="" class="{piece}" data-piece="' +
            e +
            '" style="width:' +
            b +
            "px;height:" +
            b +
            "px;"),
          r && (t += "display:none;"),
          ee((t += '" />'), H)
        );
      }
      function x(e) {
        var r = ["wK", "wQ", "wR", "wB", "wN", "wP"];
        "black" === e && (r = ["bK", "bQ", "bR", "bB", "bN", "bP"]);
        for (var n = "", t = 0; t < r.length; t++) n += y(r[t], !1, v[r[t]]);
        return n;
      }
      function O(e, r, n, t) {
        var o = z("#" + g[e]),
          a = o.offset(),
          i = z("#" + g[r]),
          s = i.offset(),
          p = Z();
        z("body").append(y(n, !0, p));
        var c = z("#" + p);
        c.css({ display: "", position: "absolute", top: a.top, left: a.left }),
          o.find("." + H.piece).remove();
        var u = {
          duration: f.moveSpeed,
          complete: function () {
            i.append(y(n)), c.remove(), ne(t) && t();
          },
        };
        c.animate(s, u);
      }
      function S(e, r, n) {
        var t = z("#" + v[e]).offset(),
          o = z("#" + g[r]),
          a = o.offset(),
          i = Z();
        z("body").append(y(e, !0, i));
        var s = z("#" + i);
        s.css({ display: "", position: "absolute", left: t.left, top: t.top });
        var p = {
          duration: f.moveSpeed,
          complete: function () {
            o.find("." + H.piece).remove(),
              o.append(y(e)),
              s.remove(),
              ne(n) && n();
          },
        };
        s.animate(a, p);
      }
      function T() {
        for (var e in (r.find("." + H.piece).remove(), c))
          c.hasOwnProperty(e) && z("#" + g[e]).append(y(c[e]));
      }
      function q() {
        r.html(
          (function (e) {
            "black" !== e && (e = "white");
            var r = "",
              n = _(F),
              t = 8;
            "black" === e && (n.reverse(), (t = 1));
            for (var o = "white", a = 0; a < 8; a++) {
              r += '<div class="{row}">';
              for (var i = 0; i < 8; i++) {
                var s = n[i] + t;
                (r +=
                  '<div class="{square} ' +
                  H[o] +
                  " square-" +
                  s +
                  '" style="width:' +
                  b +
                  "px;height:" +
                  b +
                  'px;" id="' +
                  g[s] +
                  '" data-square="' +
                  s +
                  '">'),
                  f.showNotation &&
                    ((("white" === e && 1 === t) ||
                      ("black" === e && 8 === t)) &&
                      (r +=
                        '<div class="{notation} {alpha}">' + n[i] + "</div>"),
                    0 === i &&
                      (r +=
                        '<div class="{notation} {numeric}">' + t + "</div>")),
                  (r += "</div>"),
                  (o = "white" === o ? "black" : "white");
              }
              (r += '<div class="{clearfix}"></div></div>'),
                (o = "white" === o ? "black" : "white"),
                "white" === e ? (t -= 1) : (t += 1);
            }
            return ee(r, H);
          })(p, f.showNotation)
        ),
          T(),
          f.sparePieces &&
            ("white" === p
              ? (t.html(x("black")), o.html(x("white")))
              : (t.html(x("white")), o.html(x("black"))));
      }
      function k(e) {
        var r = _(c),
          n = _(e);
        ce(r) !== ce(n) && (ne(f.onChange) && f.onChange(r, n), (c = e));
      }
      function E(e, r) {
        for (var n in w)
          if (w.hasOwnProperty(n)) {
            var t = w[n];
            if (e >= t.left && e < t.left + b && r >= t.top && r < t.top + b)
              return n;
          }
        return "offboard";
      }
      function C() {
        r.find("." + H.square).removeClass(H.highlight1 + " " + H.highlight2);
      }
      function B() {
        C();
        var e = _(c);
        delete e[h], k(e), T(), a.fadeOut(f.trashSpeed), (l = !1);
      }
      function I(e, r, n, t) {
        (ne(f.onDragStart) && !1 === f.onDragStart(e, r, _(c), p)) ||
          ((l = !0),
          (u = r),
          (d = "spare" === (h = e) ? "offboard" : e),
          (function () {
            for (var e in ((w = {}), g))
              g.hasOwnProperty(e) && (w[e] = z("#" + g[e]).offset());
          })(),
          a
            .attr("src", P(r))
            .css({
              display: "",
              position: "absolute",
              left: n - b / 2,
              top: t - b / 2,
            }),
          "spare" !== e &&
            z("#" + g[e])
              .addClass(H.highlight1)
              .find("." + H.piece)
              .css("display", "none"));
      }
      function M(e, r) {
        a.css({ left: e - b / 2, top: r - b / 2 });
        var n = E(e, r);
        n !== d &&
          (oe(d) && z("#" + g[d]).removeClass(H.highlight2),
          oe(n) && z("#" + g[n]).addClass(H.highlight2),
          ne(f.onDragMove) && f.onDragMove(n, d, h, u, _(c), p),
          (d = n));
      }
      function N(e) {
        var r = "drop";
        if (
          ("offboard" === e &&
            "snapback" === f.dropOffBoard &&
            (r = "snapback"),
          "offboard" === e && "trash" === f.dropOffBoard && (r = "trash"),
          ne(f.onDrop))
        ) {
          var n = _(c);
          "spare" === h && oe(e) && (n[e] = u),
            oe(h) && "offboard" === e && delete n[h],
            oe(h) && oe(e) && (delete n[h], (n[e] = u));
          var t = _(c),
            o = f.onDrop(h, e, u, n, t, p);
          ("snapback" !== o && "trash" !== o) || (r = o);
        }
        "snapback" === r
          ? (function () {
              if ("spare" !== h) {
                C();
                var e = z("#" + g[h]).offset(),
                  r = {
                    duration: f.snapbackSpeed,
                    complete: function () {
                      T(),
                        a.css("display", "none"),
                        ne(f.onSnapbackEnd) && f.onSnapbackEnd(u, h, _(c), p);
                    },
                  };
                a.animate(e, r), (l = !1);
              } else B();
            })()
          : "trash" === r
          ? B()
          : "drop" === r &&
            (function (e) {
              C();
              var r = _(c);
              delete r[h], (r[e] = u), k(r);
              var n = z("#" + g[e]).offset(),
                t = {
                  duration: f.snapSpeed,
                  complete: function () {
                    T(),
                      a.css("display", "none"),
                      ne(f.onSnapEnd) && f.onSnapEnd(h, e, u);
                  },
                };
              a.animate(n, t), (l = !1);
            })(e);
      }
      function j(e) {
        e.preventDefault();
      }
      function D(e) {
        if (f.draggable) {
          var r = z(this).attr("data-square");
          oe(r) && c.hasOwnProperty(r) && I(r, c[r], e.pageX, e.pageY);
        }
      }
      function R(e) {
        if (f.draggable) {
          var r = z(this).attr("data-square");
          oe(r) &&
            c.hasOwnProperty(r) &&
            ((e = e.originalEvent),
            I(r, c[r], e.changedTouches[0].pageX, e.changedTouches[0].pageY));
        }
      }
      function Q(e) {
        f.sparePieces &&
          I("spare", z(this).attr("data-piece"), e.pageX, e.pageY);
      }
      function X(e) {
        f.sparePieces &&
          I(
            "spare",
            z(this).attr("data-piece"),
            (e = e.originalEvent).changedTouches[0].pageX,
            e.changedTouches[0].pageY
          );
      }
      (i.clear = function (e) {
        i.position({}, e);
      }),
        (i.destroy = function () {
          n.html(""), a.remove(), n.unbind();
        }),
        (i.fen = function () {
          return i.position("fen");
        }),
        (i.flip = function () {
          return i.orientation("flip");
        }),
        (i.move = function () {
          if (0 !== arguments.length) {
            for (var e = !0, r = {}, n = 0; n < arguments.length; n++)
              if (!1 !== arguments[n])
                if (te(arguments[n])) {
                  var t = arguments[n].split("-");
                  r[t[0]] = t[1];
                } else
                  m(
                    2826,
                    "Invalid move passed to the move method.",
                    arguments[n]
                  );
              else e = !1;
            var o = (function (e, r) {
              var n = _(e);
              for (var t in r)
                if (r.hasOwnProperty(t) && n.hasOwnProperty(t)) {
                  var o = n[t];
                  delete n[t], (n[r[t]] = o);
                }
              return n;
            })(c, r);
            return i.position(o, e), o;
          }
        }),
        (i.orientation = function (e) {
          return 0 === arguments.length
            ? p
            : "white" === e || "black" === e
            ? ((p = e), q(), p)
            : "flip" === e
            ? ((p = "white" === p ? "black" : "white"), q(), p)
            : void m(
                5482,
                "Invalid value passed to the orientation method.",
                e
              );
        }),
        (i.position = function (e, r) {
          if (0 === arguments.length) return _(c);
          if (re(e) && "fen" === e.toLowerCase()) return ce(c);
          (re(e) && "start" === e.toLowerCase() && (e = _(G)),
          ae(e) && (e = pe(e)),
          ie(e))
            ? (!1 !== r && (r = !0),
              r
                ? ((function (e, r, n) {
                    if (0 !== e.length)
                      for (var t = 0, o = 0; o < e.length; o++) {
                        var a = e[o];
                        "clear" === a.type
                          ? z("#" + g[a.square] + " ." + H.piece).fadeOut(
                              f.trashSpeed,
                              i
                            )
                          : "add" !== a.type || f.sparePieces
                          ? "add" === a.type && f.sparePieces
                            ? S(a.piece, a.square, i)
                            : "move" === a.type &&
                              O(a.source, a.destination, a.piece, i)
                          : z("#" + g[a.square])
                              .append(y(a.piece, !0))
                              .find("." + H.piece)
                              .fadeIn(f.appearSpeed, i);
                      }
                    function i() {
                      (t += 1) === e.length &&
                        (T(), ne(f.onMoveEnd) && f.onMoveEnd(_(r), _(n)));
                    }
                  })(
                    (function (e, r) {
                      (e = _(e)), (r = _(r));
                      var n = [],
                        t = {};
                      for (var o in r)
                        r.hasOwnProperty(o) &&
                          e.hasOwnProperty(o) &&
                          e[o] === r[o] &&
                          (delete e[o], delete r[o]);
                      for (o in r)
                        if (r.hasOwnProperty(o)) {
                          var a = ue(e, r[o], o);
                          a &&
                            (n.push({
                              type: "move",
                              source: a,
                              destination: o,
                              piece: r[o],
                            }),
                            delete e[a],
                            delete r[o],
                            (t[o] = !0));
                        }
                      for (o in r)
                        r.hasOwnProperty(o) &&
                          (n.push({ type: "add", square: o, piece: r[o] }),
                          delete r[o]);
                      for (o in e)
                        e.hasOwnProperty(o) &&
                          (t.hasOwnProperty(o) ||
                            (n.push({ type: "clear", square: o, piece: e[o] }),
                            delete e[o]));
                      return n;
                    })(c, e),
                    c,
                    e
                  ),
                  k(e))
                : (k(e), T()))
            : m(6482, "Invalid value passed to the position method.", e);
        }),
        (i.resize = function () {
          (b = (function () {
            var e = parseInt(n.width(), 10);
            if (!e || e <= 0) return 0;
            for (var r = e - 1; r % 8 != 0 && 0 < r; ) r -= 1;
            return r / 8;
          })()),
            r.css("width", 8 * b + "px"),
            a.css({ height: b, width: b }),
            f.sparePieces &&
              n.find("." + H.sparePieces).css("paddingLeft", b + s + "px"),
            q();
        }),
        (i.start = function (e) {
          i.position("start", e);
        });
      var Y = V(function (e) {
          l && M(e.pageX, e.pageY);
        }, f.dragThrottleRate),
        K = V(function (e) {
          l &&
            (e.preventDefault(),
            M(
              e.originalEvent.changedTouches[0].pageX,
              e.originalEvent.changedTouches[0].pageY
            ));
        }, f.dragThrottleRate);
      function L(e) {
        l && N(E(e.pageX, e.pageY));
      }
      function U(e) {
        l &&
          N(
            E(
              e.originalEvent.changedTouches[0].pageX,
              e.originalEvent.changedTouches[0].pageY
            )
          );
      }
      function $(e) {
        if (!l && ne(f.onMouseoverSquare)) {
          var r = z(e.currentTarget).attr("data-square");
          if (oe(r)) {
            var n = !1;
            c.hasOwnProperty(r) && (n = c[r]),
              f.onMouseoverSquare(r, n, _(c), p);
          }
        }
      }
      function J(e) {
        if (!l && ne(f.onMouseoutSquare)) {
          var r = z(e.currentTarget).attr("data-square");
          if (oe(r)) {
            var n = !1;
            c.hasOwnProperty(r) && (n = c[r]),
              f.onMouseoutSquare(r, n, _(c), p);
          }
        }
      }
      return (
        (p = f.orientation),
        f.hasOwnProperty("position") &&
          ("start" === f.position
            ? (c = _(G))
            : ae(f.position)
            ? (c = pe(f.position))
            : ie(f.position)
            ? (c = _(f.position))
            : m(7263, "Invalid value passed to config.position.", f.position)),
        (function () {
          !(function () {
            for (var e = 0; e < F.length; e++)
              for (var r = 1; r <= 8; r++) {
                var n = F[e] + r;
                g[n] = n + "-" + Z();
              }
            var t = "KQRNBP".split("");
            for (e = 0; e < t.length; e++) {
              var o = "w" + t[e],
                a = "b" + t[e];
              (v[o] = o + "-" + Z()), (v[a] = a + "-" + Z());
            }
          })(),
            n.html(
              (function (e) {
                var r = '<div class="{chessboard}">';
                return (
                  e &&
                    (r += '<div class="{sparePieces} {sparePiecesTop}"></div>'),
                  (r += '<div class="{board}"></div>'),
                  e &&
                    (r +=
                      '<div class="{sparePieces} {sparePiecesBottom}"></div>'),
                  ee((r += "</div>"), H)
                );
              })(f.sparePieces)
            ),
            (r = n.find("." + H.board)),
            f.sparePieces &&
              ((t = n.find("." + H.sparePiecesTop)),
              (o = n.find("." + H.sparePiecesBottom)));
          var e = Z();
          z("body").append(y("wP", !0, e)),
            (a = z("#" + e)),
            (s = parseInt(r.css("borderLeftWidth"), 10)),
            i.resize();
        })(),
        (function () {
          z("body").on("mousedown mousemove", "." + H.piece, j),
            r.on("mousedown", "." + H.square, D),
            n.on("mousedown", "." + H.sparePieces + " ." + H.piece, Q),
            r
              .on("mouseenter", "." + H.square, $)
              .on("mouseleave", "." + H.square, J);
          var e = z(window);
          e.on("mousemove", Y).on("mouseup", L),
            "ontouchstart" in document.documentElement &&
              (r.on("touchstart", "." + H.square, R),
              n.on("touchstart", "." + H.sparePieces + " ." + H.piece, X),
              e.on("touchmove", K).on("touchend", U));
        })(),
        i
      );
    }),
    (window.ChessBoard = window.Chessboard),
    (window.Chessboard.fenToObj = pe),
    (window.Chessboard.objToFen = ce);
})();
