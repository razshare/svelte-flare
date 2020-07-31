
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.24.0 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(10, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(9, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(8, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$base,
    		$location,
    		$routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 256) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 1536) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [routes, location, base, basepath, url, $$scope, $$slots];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.24.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, routeParams, $location*/ 530) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Route", $$slots, ['default']);

    	$$self.$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var Flare_min = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(window,function(){return function(t){var e={};function r(n){if(e[n])return e[n].exports;var s=e[n]={i:n,l:!1,exports:{}};return t[n].call(s.exports,s,s.exports,r),s.l=!0,s.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n});},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var s in t)r.d(n,s,function(e){return t[e]}.bind(null,s));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=30)}([function(t,e,r){var n={};r.r(n),r.d(n,"create",function(){return l}),r.d(n,"clone",function(){return h}),r.d(n,"copy",function(){return d}),r.d(n,"identity",function(){return u}),r.d(n,"fromValues",function(){return _}),r.d(n,"set",function(){return f}),r.d(n,"invert",function(){return p}),r.d(n,"determinant",function(){return m}),r.d(n,"multiply",function(){return g}),r.d(n,"rotate",function(){return y}),r.d(n,"scale",function(){return b}),r.d(n,"translate",function(){return S}),r.d(n,"fromRotation",function(){return C}),r.d(n,"fromScaling",function(){return I}),r.d(n,"fromTranslation",function(){return A}),r.d(n,"str",function(){return M}),r.d(n,"frob",function(){return T}),r.d(n,"add",function(){return w}),r.d(n,"subtract",function(){return k}),r.d(n,"multiplyScalar",function(){return P}),r.d(n,"multiplyScalarAndAdd",function(){return v}),r.d(n,"exactEquals",function(){return x}),r.d(n,"equals",function(){return O}),r.d(n,"mul",function(){return D}),r.d(n,"sub",function(){return F});var s={};r.r(s),r.d(s,"create",function(){return R}),r.d(s,"clone",function(){return B}),r.d(s,"fromValues",function(){return E}),r.d(s,"copy",function(){return V}),r.d(s,"set",function(){return L}),r.d(s,"add",function(){return U}),r.d(s,"subtract",function(){return N}),r.d(s,"multiply",function(){return W}),r.d(s,"divide",function(){return X}),r.d(s,"ceil",function(){return G}),r.d(s,"floor",function(){return H}),r.d(s,"min",function(){return q}),r.d(s,"max",function(){return Y}),r.d(s,"round",function(){return j}),r.d(s,"scale",function(){return z}),r.d(s,"scaleAndAdd",function(){return K}),r.d(s,"distance",function(){return J}),r.d(s,"squaredDistance",function(){return Q}),r.d(s,"length",function(){return Z}),r.d(s,"squaredLength",function(){return $}),r.d(s,"negate",function(){return tt}),r.d(s,"inverse",function(){return et}),r.d(s,"normalize",function(){return rt}),r.d(s,"dot",function(){return nt}),r.d(s,"cross",function(){return st}),r.d(s,"lerp",function(){return it}),r.d(s,"random",function(){return at}),r.d(s,"transformMat2",function(){return ot}),r.d(s,"transformMat2d",function(){return ct}),r.d(s,"transformMat3",function(){return lt}),r.d(s,"transformMat4",function(){return ht}),r.d(s,"rotate",function(){return dt}),r.d(s,"angle",function(){return ut}),r.d(s,"str",function(){return _t}),r.d(s,"exactEquals",function(){return ft}),r.d(s,"equals",function(){return pt}),r.d(s,"len",function(){return mt}),r.d(s,"sub",function(){return gt}),r.d(s,"mul",function(){return yt}),r.d(s,"div",function(){return bt}),r.d(s,"dist",function(){return St}),r.d(s,"sqrDist",function(){return Ct}),r.d(s,"sqrLen",function(){return It}),r.d(s,"forEach",function(){return At});var i={};r.r(i),r.d(i,"create",function(){return Mt}),r.d(i,"clone",function(){return Tt}),r.d(i,"fromValues",function(){return wt}),r.d(i,"copy",function(){return kt}),r.d(i,"set",function(){return Pt}),r.d(i,"add",function(){return vt}),r.d(i,"subtract",function(){return xt}),r.d(i,"multiply",function(){return Ot}),r.d(i,"divide",function(){return Dt}),r.d(i,"ceil",function(){return Ft}),r.d(i,"floor",function(){return Rt}),r.d(i,"min",function(){return Bt}),r.d(i,"max",function(){return Et}),r.d(i,"round",function(){return Vt}),r.d(i,"scale",function(){return Lt}),r.d(i,"scaleAndAdd",function(){return Ut}),r.d(i,"distance",function(){return Nt}),r.d(i,"squaredDistance",function(){return Wt}),r.d(i,"length",function(){return Xt}),r.d(i,"squaredLength",function(){return Gt}),r.d(i,"negate",function(){return Ht}),r.d(i,"inverse",function(){return qt}),r.d(i,"normalize",function(){return Yt}),r.d(i,"dot",function(){return jt}),r.d(i,"lerp",function(){return zt}),r.d(i,"random",function(){return Kt}),r.d(i,"transformMat4",function(){return Jt}),r.d(i,"transformQuat",function(){return Qt}),r.d(i,"str",function(){return Zt}),r.d(i,"exactEquals",function(){return $t}),r.d(i,"equals",function(){return te}),r.d(i,"sub",function(){return ee}),r.d(i,"mul",function(){return re}),r.d(i,"div",function(){return ne}),r.d(i,"dist",function(){return se}),r.d(i,"sqrDist",function(){return ie}),r.d(i,"len",function(){return ae}),r.d(i,"sqrLen",function(){return oe}),r.d(i,"forEach",function(){return ce});var a=1e-6,o="undefined"!=typeof Float32Array?Float32Array:Array,c=Math.random;function l(){var t=new o(6);return o!=Float32Array&&(t[1]=0,t[2]=0,t[4]=0,t[5]=0),t[0]=1,t[3]=1,t}function h(t){var e=new o(6);return e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e}function d(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t}function u(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t}function _(t,e,r,n,s,i){var a=new o(6);return a[0]=t,a[1]=e,a[2]=r,a[3]=n,a[4]=s,a[5]=i,a}function f(t,e,r,n,s,i,a){return t[0]=e,t[1]=r,t[2]=n,t[3]=s,t[4]=i,t[5]=a,t}function p(t,e){var r=e[0],n=e[1],s=e[2],i=e[3],a=e[4],o=e[5],c=r*i-n*s;return c?(c=1/c,t[0]=i*c,t[1]=-n*c,t[2]=-s*c,t[3]=r*c,t[4]=(s*o-i*a)*c,t[5]=(n*a-r*o)*c,t):null}function m(t){return t[0]*t[3]-t[1]*t[2]}function g(t,e,r){var n=e[0],s=e[1],i=e[2],a=e[3],o=e[4],c=e[5],l=r[0],h=r[1],d=r[2],u=r[3],_=r[4],f=r[5];return t[0]=n*l+i*h,t[1]=s*l+a*h,t[2]=n*d+i*u,t[3]=s*d+a*u,t[4]=n*_+i*f+o,t[5]=s*_+a*f+c,t}function y(t,e,r){var n=e[0],s=e[1],i=e[2],a=e[3],o=e[4],c=e[5],l=Math.sin(r),h=Math.cos(r);return t[0]=n*h+i*l,t[1]=s*h+a*l,t[2]=n*-l+i*h,t[3]=s*-l+a*h,t[4]=o,t[5]=c,t}function b(t,e,r){var n=e[0],s=e[1],i=e[2],a=e[3],o=e[4],c=e[5],l=r[0],h=r[1];return t[0]=n*l,t[1]=s*l,t[2]=i*h,t[3]=a*h,t[4]=o,t[5]=c,t}function S(t,e,r){var n=e[0],s=e[1],i=e[2],a=e[3],o=e[4],c=e[5],l=r[0],h=r[1];return t[0]=n,t[1]=s,t[2]=i,t[3]=a,t[4]=n*l+i*h+o,t[5]=s*l+a*h+c,t}function C(t,e){var r=Math.sin(e),n=Math.cos(e);return t[0]=n,t[1]=r,t[2]=-r,t[3]=n,t[4]=0,t[5]=0,t}function I(t,e){return t[0]=e[0],t[1]=0,t[2]=0,t[3]=e[1],t[4]=0,t[5]=0,t}function A(t,e){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=e[0],t[5]=e[1],t}function M(t){return "mat2d("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+")"}function T(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+1)}function w(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t[3]=e[3]+r[3],t[4]=e[4]+r[4],t[5]=e[5]+r[5],t}function k(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t[3]=e[3]-r[3],t[4]=e[4]-r[4],t[5]=e[5]-r[5],t}function P(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t[3]=e[3]*r,t[4]=e[4]*r,t[5]=e[5]*r,t}function v(t,e,r,n){return t[0]=e[0]+r[0]*n,t[1]=e[1]+r[1]*n,t[2]=e[2]+r[2]*n,t[3]=e[3]+r[3]*n,t[4]=e[4]+r[4]*n,t[5]=e[5]+r[5]*n,t}function x(t,e){return t[0]===e[0]&&t[1]===e[1]&&t[2]===e[2]&&t[3]===e[3]&&t[4]===e[4]&&t[5]===e[5]}function O(t,e){var r=t[0],n=t[1],s=t[2],i=t[3],o=t[4],c=t[5],l=e[0],h=e[1],d=e[2],u=e[3],_=e[4],f=e[5];return Math.abs(r-l)<=a*Math.max(1,Math.abs(r),Math.abs(l))&&Math.abs(n-h)<=a*Math.max(1,Math.abs(n),Math.abs(h))&&Math.abs(s-d)<=a*Math.max(1,Math.abs(s),Math.abs(d))&&Math.abs(i-u)<=a*Math.max(1,Math.abs(i),Math.abs(u))&&Math.abs(o-_)<=a*Math.max(1,Math.abs(o),Math.abs(_))&&Math.abs(c-f)<=a*Math.max(1,Math.abs(c),Math.abs(f))}var D=g,F=k;function R(){var t=new o(2);return o!=Float32Array&&(t[0]=0,t[1]=0),t}function B(t){var e=new o(2);return e[0]=t[0],e[1]=t[1],e}function E(t,e){var r=new o(2);return r[0]=t,r[1]=e,r}function V(t,e){return t[0]=e[0],t[1]=e[1],t}function L(t,e,r){return t[0]=e,t[1]=r,t}function U(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t}function N(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t}function W(t,e,r){return t[0]=e[0]*r[0],t[1]=e[1]*r[1],t}function X(t,e,r){return t[0]=e[0]/r[0],t[1]=e[1]/r[1],t}function G(t,e){return t[0]=Math.ceil(e[0]),t[1]=Math.ceil(e[1]),t}function H(t,e){return t[0]=Math.floor(e[0]),t[1]=Math.floor(e[1]),t}function q(t,e,r){return t[0]=Math.min(e[0],r[0]),t[1]=Math.min(e[1],r[1]),t}function Y(t,e,r){return t[0]=Math.max(e[0],r[0]),t[1]=Math.max(e[1],r[1]),t}function j(t,e){return t[0]=Math.round(e[0]),t[1]=Math.round(e[1]),t}function z(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t}function K(t,e,r,n){return t[0]=e[0]+r[0]*n,t[1]=e[1]+r[1]*n,t}function J(t,e){var r=e[0]-t[0],n=e[1]-t[1];return Math.sqrt(r*r+n*n)}function Q(t,e){var r=e[0]-t[0],n=e[1]-t[1];return r*r+n*n}function Z(t){var e=t[0],r=t[1];return Math.sqrt(e*e+r*r)}function $(t){var e=t[0],r=t[1];return e*e+r*r}function tt(t,e){return t[0]=-e[0],t[1]=-e[1],t}function et(t,e){return t[0]=1/e[0],t[1]=1/e[1],t}function rt(t,e){var r=e[0],n=e[1],s=r*r+n*n;return s>0&&(s=1/Math.sqrt(s),t[0]=e[0]*s,t[1]=e[1]*s),t}function nt(t,e){return t[0]*e[0]+t[1]*e[1]}function st(t,e,r){var n=e[0]*r[1]-e[1]*r[0];return t[0]=t[1]=0,t[2]=n,t}function it(t,e,r,n){var s=e[0],i=e[1];return t[0]=s+n*(r[0]-s),t[1]=i+n*(r[1]-i),t}function at(t,e){e=e||1;var r=2*c()*Math.PI;return t[0]=Math.cos(r)*e,t[1]=Math.sin(r)*e,t}function ot(t,e,r){var n=e[0],s=e[1];return t[0]=r[0]*n+r[2]*s,t[1]=r[1]*n+r[3]*s,t}function ct(t,e,r){var n=e[0],s=e[1];return t[0]=r[0]*n+r[2]*s+r[4],t[1]=r[1]*n+r[3]*s+r[5],t}function lt(t,e,r){var n=e[0],s=e[1];return t[0]=r[0]*n+r[3]*s+r[6],t[1]=r[1]*n+r[4]*s+r[7],t}function ht(t,e,r){var n=e[0],s=e[1];return t[0]=r[0]*n+r[4]*s+r[12],t[1]=r[1]*n+r[5]*s+r[13],t}function dt(t,e,r,n){var s=e[0]-r[0],i=e[1]-r[1],a=Math.sin(n),o=Math.cos(n);return t[0]=s*o-i*a+r[0],t[1]=s*a+i*o+r[1],t}function ut(t,e){var r=t[0],n=t[1],s=e[0],i=e[1],a=r*r+n*n;a>0&&(a=1/Math.sqrt(a));var o=s*s+i*i;o>0&&(o=1/Math.sqrt(o));var c=(r*s+n*i)*a*o;return c>1?0:c<-1?Math.PI:Math.acos(c)}function _t(t){return "vec2("+t[0]+", "+t[1]+")"}function ft(t,e){return t[0]===e[0]&&t[1]===e[1]}function pt(t,e){var r=t[0],n=t[1],s=e[0],i=e[1];return Math.abs(r-s)<=a*Math.max(1,Math.abs(r),Math.abs(s))&&Math.abs(n-i)<=a*Math.max(1,Math.abs(n),Math.abs(i))}var mt=Z,gt=N,yt=W,bt=X,St=J,Ct=Q,It=$,At=function(){var t=R();return function(e,r,n,s,i,a){var o=void 0,c=void 0;for(r||(r=2),n||(n=0),c=s?Math.min(s*r+n,e.length):e.length,o=n;o<c;o+=r)t[0]=e[o],t[1]=e[o+1],i(t,t,a),e[o]=t[0],e[o+1]=t[1];return e}}();function Mt(){var t=new o(4);return o!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t}function Tt(t){var e=new o(4);return e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e}function wt(t,e,r,n){var s=new o(4);return s[0]=t,s[1]=e,s[2]=r,s[3]=n,s}function kt(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t}function Pt(t,e,r,n,s){return t[0]=e,t[1]=r,t[2]=n,t[3]=s,t}function vt(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t[3]=e[3]+r[3],t}function xt(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t[3]=e[3]-r[3],t}function Ot(t,e,r){return t[0]=e[0]*r[0],t[1]=e[1]*r[1],t[2]=e[2]*r[2],t[3]=e[3]*r[3],t}function Dt(t,e,r){return t[0]=e[0]/r[0],t[1]=e[1]/r[1],t[2]=e[2]/r[2],t[3]=e[3]/r[3],t}function Ft(t,e){return t[0]=Math.ceil(e[0]),t[1]=Math.ceil(e[1]),t[2]=Math.ceil(e[2]),t[3]=Math.ceil(e[3]),t}function Rt(t,e){return t[0]=Math.floor(e[0]),t[1]=Math.floor(e[1]),t[2]=Math.floor(e[2]),t[3]=Math.floor(e[3]),t}function Bt(t,e,r){return t[0]=Math.min(e[0],r[0]),t[1]=Math.min(e[1],r[1]),t[2]=Math.min(e[2],r[2]),t[3]=Math.min(e[3],r[3]),t}function Et(t,e,r){return t[0]=Math.max(e[0],r[0]),t[1]=Math.max(e[1],r[1]),t[2]=Math.max(e[2],r[2]),t[3]=Math.max(e[3],r[3]),t}function Vt(t,e){return t[0]=Math.round(e[0]),t[1]=Math.round(e[1]),t[2]=Math.round(e[2]),t[3]=Math.round(e[3]),t}function Lt(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t[3]=e[3]*r,t}function Ut(t,e,r,n){return t[0]=e[0]+r[0]*n,t[1]=e[1]+r[1]*n,t[2]=e[2]+r[2]*n,t[3]=e[3]+r[3]*n,t}function Nt(t,e){var r=e[0]-t[0],n=e[1]-t[1],s=e[2]-t[2],i=e[3]-t[3];return Math.sqrt(r*r+n*n+s*s+i*i)}function Wt(t,e){var r=e[0]-t[0],n=e[1]-t[1],s=e[2]-t[2],i=e[3]-t[3];return r*r+n*n+s*s+i*i}function Xt(t){var e=t[0],r=t[1],n=t[2],s=t[3];return Math.sqrt(e*e+r*r+n*n+s*s)}function Gt(t){var e=t[0],r=t[1],n=t[2],s=t[3];return e*e+r*r+n*n+s*s}function Ht(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t[3]=-e[3],t}function qt(t,e){return t[0]=1/e[0],t[1]=1/e[1],t[2]=1/e[2],t[3]=1/e[3],t}function Yt(t,e){var r=e[0],n=e[1],s=e[2],i=e[3],a=r*r+n*n+s*s+i*i;return a>0&&(a=1/Math.sqrt(a),t[0]=r*a,t[1]=n*a,t[2]=s*a,t[3]=i*a),t}function jt(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]+t[3]*e[3]}function zt(t,e,r,n){var s=e[0],i=e[1],a=e[2],o=e[3];return t[0]=s+n*(r[0]-s),t[1]=i+n*(r[1]-i),t[2]=a+n*(r[2]-a),t[3]=o+n*(r[3]-o),t}function Kt(t,e){var r,n,s,i,a,o;e=e||1;do{a=(r=2*c()-1)*r+(n=2*c()-1)*n;}while(a>=1);do{o=(s=2*c()-1)*s+(i=2*c()-1)*i;}while(o>=1);var l=Math.sqrt((1-a)/o);return t[0]=e*r,t[1]=e*n,t[2]=e*s*l,t[3]=e*i*l,t}function Jt(t,e,r){var n=e[0],s=e[1],i=e[2],a=e[3];return t[0]=r[0]*n+r[4]*s+r[8]*i+r[12]*a,t[1]=r[1]*n+r[5]*s+r[9]*i+r[13]*a,t[2]=r[2]*n+r[6]*s+r[10]*i+r[14]*a,t[3]=r[3]*n+r[7]*s+r[11]*i+r[15]*a,t}function Qt(t,e,r){var n=e[0],s=e[1],i=e[2],a=r[0],o=r[1],c=r[2],l=r[3],h=l*n+o*i-c*s,d=l*s+c*n-a*i,u=l*i+a*s-o*n,_=-a*n-o*s-c*i;return t[0]=h*l+_*-a+d*-c-u*-o,t[1]=d*l+_*-o+u*-a-h*-c,t[2]=u*l+_*-c+h*-o-d*-a,t[3]=e[3],t}function Zt(t){return "vec4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"}function $t(t,e){return t[0]===e[0]&&t[1]===e[1]&&t[2]===e[2]&&t[3]===e[3]}function te(t,e){var r=t[0],n=t[1],s=t[2],i=t[3],o=e[0],c=e[1],l=e[2],h=e[3];return Math.abs(r-o)<=a*Math.max(1,Math.abs(r),Math.abs(o))&&Math.abs(n-c)<=a*Math.max(1,Math.abs(n),Math.abs(c))&&Math.abs(s-l)<=a*Math.max(1,Math.abs(s),Math.abs(l))&&Math.abs(i-h)<=a*Math.max(1,Math.abs(i),Math.abs(h))}var ee=xt,re=Ot,ne=Dt,se=Nt,ie=Wt,ae=Xt,oe=Gt,ce=function(){var t=Mt();return function(e,r,n,s,i,a){var o=void 0,c=void 0;for(r||(r=4),n||(n=0),c=s?Math.min(s*r+n,e.length):e.length,o=n;o<c;o+=r)t[0]=e[o],t[1]=e[o+1],t[2]=e[o+2],t[3]=e[o+3],i(t,t,a),e[o]=t[0],e[o+1]=t[1],e[o+2]=t[2],e[o+3]=t[3];return e}}();r.d(e,"a",function(){return n}),r.d(e,"b",function(){return s}),r.d(e,"c",function(){return i});},function(t,e,r){r.d(e,"b",function(){return i}),r.d(e,"c",function(){return o}),r.d(e,"a",function(){return c});var n=r(0);const s=new Float32Array(6);class i{static get Straight(){return 0}static get Mirror(){return 1}static get Disconnected(){return 2}static get Asymmetric(){return 3}}class a{constructor(){this._PointType=i.Straight,this._Translation=n.b.create(),this._Weights=null;}get pointType(){return this._PointType}get translation(){return this._Translation}makeInstance(){return null}copy(t){this._PointType=t._PointType,this._Weights=t._Weights,n.b.copy(this._Translation,t._Translation);}}class o extends a{constructor(){super(),this._Radius=0;}get radius(){return this._Radius}makeInstance(){const t=new o;return o.prototype.copy.call(t,this),t}copy(t){super.copy(t),this._Radius=t._Radius;}skin(t,e){let{_Weights:r,translation:n,pointType:i,radius:a}=this,o=t[0]*n[0]+t[2]*n[1]+t[4],c=t[1]*n[0]+t[3]*n[1]+t[5];const l={pointType:i,o:this,radius:a},h=s;h.fill(0);for(let t=0;t<4;t++){const n=r[t],s=r[t+4];if(s>0){let t=6*n;for(let r=0;r<6;r++)h[r]+=e[t+r]*s;}}return l.translation=new Float32Array([h[0]*o+h[2]*c+h[4],h[1]*o+h[3]*c+h[5]]),l}}class c extends a{constructor(){super(),this._In=n.b.create(),this._Out=n.b.create();}get in(){return this._In}get out(){return this._Out}makeInstance(){const t=new c;return c.prototype.copy.call(t,this),t}copy(t){super.copy(t),n.b.copy(this._In,t._In),n.b.copy(this._Out,t._Out);}skin(t,e){let{_Weights:r,translation:n,pointType:i,out:a,in:o}=this,c=t[0]*n[0]+t[2]*n[1]+t[4],l=t[1]*n[0]+t[3]*n[1]+t[5];const h={pointType:i,o:this},d=s;d.fill(0);for(let t=0;t<4;t++){const n=r[t],s=r[t+4];if(s>0){let t=6*n;for(let r=0;r<6;r++)d[r]+=e[t+r]*s;}}h.translation=new Float32Array([d[0]*c+d[2]*l+d[4],d[1]*c+d[3]*l+d[5]]),c=t[0]*o[0]+t[2]*o[1]+t[4],l=t[1]*o[0]+t[3]*o[1]+t[5],d.fill(0);for(let t=8;t<12;t++){const n=r[t],s=r[t+4];if(s>0){let t=6*n;for(let r=0;r<6;r++)d[r]+=e[t+r]*s;}}h.in=new Float32Array([d[0]*c+d[2]*l+d[4],d[1]*c+d[3]*l+d[5]]),c=t[0]*a[0]+t[2]*a[1]+t[4],l=t[1]*a[0]+t[3]*a[1]+t[5],d.fill(0);for(let t=16;t<20;t++){const n=r[t],s=r[t+4];if(s>0){let t=6*n;for(let r=0;r<6;r++)d[r]+=e[t+r]*s;}}return h.out=new Float32Array([d[0]*c+d[2]*l+d[4],d[1]*c+d[3]*l+d[5]]),h}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return l});var n=r(4),s=r(0),i=r(10);const{WorldTransformDirty:a,TransformDirty:o}=i.a;function c(t){let e=t._Rotation,r=t._Translation,n=t._Scale,i=t._Transform;return s.a.fromRotation(i,e),i[4]=r[0],i[5]=r[1],s.a.scale(i,i,n),i}class l extends n.a{constructor(){super(),this._Children=[],this._Transform=s.a.create(),this._WorldTransform=s.a.create(),this._OverrideWorldTransform=!1,this._Constraints=null,this._PeerConstraints=null,this._Translation=s.b.create(),this._Rotation=0,this._Scale=s.b.set(s.b.create(),1,1),this._Opacity=1,this._RenderOpacity=1,this._IsCollapsedVisibility=!1,this._RenderCollapsed=!1,this._Clips=null;}get renderCollapsed(){return this._RenderCollapsed}get hasWorldTransform(){return !0}get children(){return this._Children}eachChildRecursive(t){const e=this._Children;for(let r of e)!1!==t(r)&&r.eachChildRecursive&&r.eachChildRecursive(t);}all(t){if(!1===t(this))return !1;const e=this._Children;for(let r of e)!1!==t(r)&&r.eachChildRecursive&&r.eachChildRecursive(t);return !0}get constraints(){return this._Constraints}get allConstraints(){return new Set((this._Constraints||[]).concat(this._PeerConstraints||[]))}addConstraint(t){let e=this._Constraints;return e||(this._Constraints=e=[]),-1===e.indexOf(t)&&(e.push(t),!0)}addPeerConstraint(t){this._PeerConstraints||(this._PeerConstraints=[]),this._PeerConstraints.push(t);}markTransformDirty(){let t=this._Actor;t&&t.addDirt(this,o)&&t.addDirt(this,a,!0);}updateWorldTransform(){const t=this._Parent;this._RenderOpacity=this._Opacity,t?(this._RenderCollapsed=this._IsCollapsedVisibility||t._RenderCollapsed,this._RenderOpacity*=t._RenderOpacity,this._OverrideWorldTransform||s.a.mul(this._WorldTransform,t._WorldTransform,this._Transform)):s.a.copy(this._WorldTransform,this._Transform);}get isNode(){return !0}get translation(){return this._Translation}set translation(t){s.b.exactEquals(this._Translation,t)||(s.b.copy(this._Translation,t),this.markTransformDirty());}get scale(){return this._Scale}set scale(t){s.b.exactEquals(this._Scale,t)||(s.b.copy(this._Scale,t),this.markTransformDirty());}get x(){return this._Translation[0]}set x(t){this._Translation[0]!=t&&(this._Translation[0]=t,this.markTransformDirty());}get y(){return this._Translation[1]}set y(t){this._Translation[1]!=t&&(this._Translation[1]=t,this.markTransformDirty());}get scaleX(){return this._Scale[0]}set scaleX(t){this._Scale[0]!=t&&(this._Scale[0]=t,this.markTransformDirty());}get scaleY(){return this._Scale[1]}set scaleY(t){this._Scale[1]!=t&&(this._Scale[1]=t,this.markTransformDirty());}get rotation(){return this._Rotation}set rotation(t){this._Rotation!=t&&(this._Rotation=t,this.markTransformDirty());}get opacity(){return this._Opacity}set opacity(t){this._Opacity!=t&&(this._Opacity=t,this.markTransformDirty());}update(t){if((t&o)===o&&c(this),(t&a)===a){this.updateWorldTransform();let t=this._Constraints;if(t)for(let e of t)e.isEnabled&&e.constrain(this);}}getWorldTransform(){if((this._DirtMask&a)!==a)return this._WorldTransform;let t=this.parent,e=[this];for(;t;)e.unshift(t),t=t.parent;for(let t of e)t.hasWorldTransform&&((this._DirtMask&o)!==o&&c(this),(this._DirtMask&a)!==a&&t.updateWorldTransform());return this._WorldTransform}get transform(){return this._Transform}get worldTransform(){return this._WorldTransform}get worldTranslation(){const t=this._WorldTransform;return s.b.set(s.b.create(),t[4],t[5])}setCollapsedVisibility(t){this._IsCollapsedVisibility!==t&&(this._IsCollapsedVisibility=t,this.markTransformDirty());}makeInstance(t){const e=new l;return e.copy(this,t),e}copy(t,e){if(super.copy(t,e),s.a.copy(this._Transform,t._Transform),s.a.copy(this._WorldTransform,t._WorldTransform),s.b.copy(this._Translation,t._Translation),s.b.copy(this._Scale,t._Scale),this._Rotation=t._Rotation,this._Opacity=t._Opacity,this._RenderOpacity=t._RenderOpacity,this._OverrideWorldTransform=t._OverrideWorldTransform,t._Clips){this._Clips=[];for(const e of t._Clips)this._Clips.push({idx:e.idx,intersect:e.intersect});}else this._Clips=null;}overrideWorldTransform(t){this._OverrideWorldTransform=!!t,s.a.copy(this._WorldTransform,t),this.markTransformDirty();}resolveComponentIndices(t){super.resolveComponentIndices(t);let e=this._Clips;if(e)for(const r of e)r.node=t[r.idx];}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return d});var n=r(0),s=r(6),i=r(12),a=r(13),o=r(8),c=r(1);let l=null,h=null;class d{constructor(t){if(t instanceof HTMLCanvasElement)this._Canvas=t,this._Cleanup=[];else {const e=t;this._onSurfaceUpdated=(()=>{this._SkContext=e.skCtx,this._SkCanvas=e.skCanvas;}),e.addEventListener("surfaceUpdate",this._onSurfaceUpdated),l=e.canvasKit,o.a.setCanvasKit(l),this._SkContext=e.skCtx,this._SkCanvas=e.skCanvas,this._ProxyGraphics=t,this._ViewTransform=n.a.create(),this._Cleanup=e._Cleanup;}this._ViewTransform=n.a.create();}initialize(t,e){if(null===l){if(h)return void h.push({graphics:this,cb:t});h=[{graphics:this,cb:t}],CanvasKitInit({locateFile:t=>e+t}).ready().then(t=>{setTimeout(()=>{l=t;for(const t of h)t.graphics.init(),t.cb();},0);});}else this.init(),t();}init(){this._GLContext=l.GetWebGLContext(this._Canvas),this._SkContext=l.MakeGrContext(this._GLContext),this.updateBackendSurface();const t=new l.SkPaint;t.setStyle(l.PaintStyle.Fill),t.setBlendMode(l.BlendMode.Clear),o.a.setCanvasKit(l),this._ClearPaint=t;}updateBackendSurface(){l&&(this._SkSurface&&this._SkSurface.delete(),l.setCurrentContext(this._GLContext),this._SkSurface=l.MakeOnScreenGLSurface(this._SkContext,this.width,this.height),this._SkCanvas=this._SkSurface.getCanvas());}save(){this._SkCanvas.save();}restore(){this._SkCanvas.restore();}transform(t){this._SkCanvas.concat([t[0],t[2],t[4],t[1],t[3],t[5],0,0,1]);}get canvas(){return this._Canvas}get ctx(){return this._GLContext}dispose(){this._proxy&&this._proxy.removeEventListener("surfaceUpdate",this._onSurfaceUpdated);}get width(){return this._Canvas.width}get height(){return this._Canvas.height}clear(t){const{_GLContext:e,_ClearPaint:r,_SkCanvas:n,width:s,height:i}=this;l.setCurrentContext(e),t?(r.setColor(l.Color(Math.round(255*t[0]),Math.round(255*t[1]),Math.round(255*t[2]),t[3])),r.setBlendMode(l.BlendMode.Src)):r.setBlendMode(l.BlendMode.Clear),n.drawRect(l.LTRBRect(0,0,s,i),r),n.save();}drawPath(t,e){this._SkCanvas.drawPath(t,e);}drawRect(t,e,r,n,s){this._SkCanvas.drawRect(l.LTRBRect(t,e,r,n),s);}setView(t){this._SkCanvas.concat([t[0],t[2],t[4],t[1],t[3],t[5],0,0,1]);}addPath(t,e,r){t.addPath(e,[r[0],r[2],r[4],r[1],r[3],r[5],0,0,1]);}makeImage(t){return l.MakeImageFromEncoded(t)}makeImageShader(t){return t.makeShader(l.TileMode.Clamp,l.TileMode.Clamp)}makePath(t){const e=new l.SkPath;return t&&this._Cleanup.push(e),e}makeVertices(t,e,r){return l.MakeSkVertices(l.VertexMode.Triangles,t,e,null,null,null,r)}drawVertices(t,e){this._SkCanvas.drawVertices(t,l.BlendMode.SrcOver,e);}copyPath(t,e){const r=t.copy();return e&&this._Cleanup.push(r),r}pathEllipse(t,e,r,n,s,i,a,o){var c=l.LTRBRect(e-n,r-s,e+n,r+s),h=u(a-i)-360*!!o;t.addArc(c,u(i),h);}static destroyPath(t){t.delete();}makeLinearGradient(t,e,r,n){return r=r.map(t=>l.Color(Math.round(255*t[0]),Math.round(255*t[1]),Math.round(255*t[2]),t[3])),l.MakeLinearGradientShader(t,e,r,n,l.TileMode.Clamp,null,0)}makeRadialGradient(t,e,r,n){return r=r.map(t=>l.Color(Math.round(255*t[0]),Math.round(255*t[1]),Math.round(255*t[2]),t[3])),l.MakeRadialGradientShader(t,e,r,n,l.TileMode.Clamp,null,0)}destroyRadialGradient(t){t.delete();}destroyLinearGradient(t){t.delete();}makePaint(t){const e=new l.SkPaint;return e.setAntiAlias(!0),e.setBlendMode(l.BlendMode.SrcOver),t&&this._Cleanup.push(e),e}setPaintFill(t){t.setStyle(l.PaintStyle.Fill);}setPaintColor(t,e){t.setColor(l.Color(Math.round(255*e[0]),Math.round(255*e[1]),Math.round(255*e[2]),e[3]));}setPaintShader(t,e){t.setShader(e),t.setFilterQuality(l.FilterQuality.Low);}static setPaintBlendMode(t,e){t.setBlendMode(e.sk);}setPathFillType(t,e){let r;switch(e){case s.a.EvenOdd:r=l.FillType.EvenOdd;break;case s.a.NonZero:r=l.FillType.Winding;}t.setFillType(r);}static setPaintStrokeCap(t,e){let r;switch(e){case i.a.Butt:r=l.StrokeCap.Butt;break;case i.a.Round:r=l.StrokeCap.Round;break;case i.a.Square:r=l.StrokeCap.Square;break;default:r=l.StrokeCap.Butt;}t.setStrokeCap(r);}static setPaintStrokeJoin(t,e){let r;switch(e){case a.a.Miter:r=l.StrokeJoin.Miter;break;case a.a.Round:r=l.StrokeJoin.Round;break;case a.a.Bevel:r=l.StrokeJoin.Bevel;break;default:r=l.StrokeJoin.Miter;}t.setStrokeJoin(r);}static setPaintStroke(t){t.setStyle(l.PaintStyle.Stroke);}destroyPaint(t){t.delete();}clipPath(t){this._SkCanvas.clipPath(t,l.ClipOp.Intersect,!0);}flush(){this._SkCanvas.restore(),this._SkSurface.flush();for(const t of this._Cleanup)t.delete();this._Cleanup.length=0;}get viewportWidth(){return this._Canvas.width}get viewportHeight(){return this._Canvas.height}setSize(t,e){return (this.width!==t||this.height!==e)&&(this._Canvas.width=t,this._Canvas.height=e,this.updateBackendSurface(),!0)}static pointPath(t,e,r){if(e.length){let n=e[0];t.moveTo(n.translation[0],n.translation[1]);for(let n=0,s=r?e.length:e.length-1,i=e.length;n<s;n++){let r=e[n],s=e[(n+1)%i],a=s.pointType===c.b.Straight?null:s.in,o=r.pointType===c.b.Straight?null:r.out;null===a&&null===o?t.lineTo(s.translation[0],s.translation[1]):(null===o&&(o=r.translation),null===a&&(a=s.translation),t.cubicTo(o[0],o[1],a[0],a[1],s.translation[0],s.translation[1]));}r&&t.close();}return t}static trimPath(t,e,r,n){const s=new l.SkPath;let i=0;{const e=new l.SkPathMeasure(t,!1,1);do{i+=e.getLength();}while(e.nextContour());e.delete();}const a=new l.SkPathMeasure(t,!1,1);let o=i*e,c=i*r,h=0;return n?(o>0&&(h=f(a,s,h,0,o)),c<i&&(h=f(a,s,h,c,i))):o<c&&(h=f(a,s,h,o,c)),a.delete(),s}static trimPathSync(t,e,r,n){const s=new l.SkPath,i=new l.SkPathMeasure(t,!1,1);do{const t=i.getLength();let a=t*e,o=t*r,c=0;n?(a>0&&p(i,s,c,0,a),o<t&&p(i,s,c,o,t)):a<o&&p(i,s,c,a,o);}while(i.nextContour());return i.delete(),s}}function u(t){return t/Math.PI*180}const _=[1,0,0,0,1,0];function f(t,e,r,n,s){let i=r;do{if(n<(i=r+t.getLength())){let a=new l.SkPath;if(t.getSegment(n-r,s-r,a,!0)&&(e.addPath(a,_),a.delete()),s<i)break}r=i;}while(t.nextContour());return r}function p(t,e,r,n,s){if(n<r+t.getLength()){let i=new l.SkPath;t.getSegment(n-r,s-r,i,!0)&&(e.addPath(i,_),i.delete());}}},function(t,e,r){r.d(e,"a",function(){return n});class n{constructor(){this._Name="Component",this._Parent=null,this._CustomProperties=[],this._DirtMask=0,this._GraphOrder=-1,this._Dependents=null,this._Actor=null,this._ParentIdx=-1;}get parent(){return this._Parent}onDirty(t){}initialize(t,e){}dispose(t,e){}update(t){}advance(t){}resolveComponentIndices(t){if(-1!==this._ParentIdx){let e=t[this._ParentIdx];this._Parent=e,this.isNode&&e&&e._Children&&e._Children.push(this),e&&this._Actor.addDependency(this,e);}}completeResolve(){}copy(t,e){this._Name=t._Name,this._ParentIdx=t._ParentIdx,this._Idx=t._Idx,this._Actor=e;}getCustomProperty(t){let e=this._CustomProperties;for(let r of e)if(r._Name===t)return r;return null}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(2);class s extends n.default{constructor(){super(),this._IsCollisionEnabled=!0;}get isCollisionEnabled(){return this._IsCollisionEnabled}copy(t,e){super.copy(t,e),this._IsCollisionEnabled=t._IsCollisionEnabled;}}},function(t,e,r){r.d(e,"a",function(){return n});class n{static get EvenOdd(){return 0}static get NonZero(){return 1}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(9);class s extends n.a{constructor(){super(),this._FirstBone=null;}makeInstance(t){const e=new s;return e.copy(this,t),e}completeResolve(){super.completeResolve();let t=this._Children;for(let e of t)if(e instanceof s)return void(this._FirstBone=e)}}},function(t,e,r){r.d(e,"a",function(){return a});const n=new Map,s=[],i=new Map;class a{constructor(t,e,r){this._LegibleID=e,this._Label=r,this._ID=t,n.set(r,this),s.push(this),i.set(t,this);}get id(){return this._ID}get label(){return this._Label}get legibleID(){return this._LegibleID}toString(){return this._LegibleID}static fromString(t){return n.get(t)||a.SrcOver}static fromID(t){return i.get(t)}static get all(){return s}static setCanvasKit(t){const e=t.BlendMode;a.Clear.sk=e.Clear,a.Src.sk=e.Src,a.Dst.sk=e.Dst,a.SrcOver.sk=e.SrcOver,a.DstOver.sk=e.DstOver,a.SrcIn.sk=e.SrcIn,a.DstIn.sk=e.DstIn,a.SrcOut.sk=e.SrcOut,a.DstOut.sk=e.DstOut,a.SrcATop.sk=e.SrcATop,a.DstATop.sk=e.DstATop,a.Xor.sk=e.Xor,a.Plus.sk=e.Plus,a.Modulate.sk=e.Modulate,a.Screen.sk=e.Screen,a.Overlay.sk=e.Overlay,a.Darken.sk=e.Darken,a.Lighten.sk=e.Lighten,a.ColorDodge.sk=e.ColorDodge,a.ColorBurn.sk=e.ColorBurn,a.HardLight.sk=e.HardLight,a.SoftLight.sk=e.SoftLight,a.Difference.sk=e.Difference,a.Exclusion.sk=e.Exclusion,a.Multiply.sk=e.Multiply,a.Hue.sk=e.Hue,a.Saturation.sk=e.Saturation,a.Color.sk=e.Color,a.Luminosity.sk=e.Luminosity;}}a.Clear=new a(0,"clear","Clear"),a.Src=new a(1,"src","Src"),a.Dst=new a(2,"dst","Dst"),a.SrcOver=new a(3,"srcOver","Src Over"),a.DstOver=new a(4,"dstOver","Dst Over"),a.SrcIn=new a(5,"srcIn","Src In"),a.DstIn=new a(6,"dstIn","Dst In"),a.SrcOut=new a(7,"srcOut","Src Out"),a.DstOut=new a(8,"dstOut","Dst Out"),a.SrcATop=new a(9,"srcATop","Src A Top"),a.DstATop=new a(10,"dstATop","Dst A Top"),a.Xor=new a(11,"xor","Xor"),a.Plus=new a(12,"plus","Plus"),a.Modulate=new a(13,"modulate","Modulate"),a.Screen=new a(14,"screen","Screen"),a.Overlay=new a(15,"overlay","Overlay"),a.Darken=new a(16,"darken","Darken"),a.Lighten=new a(17,"lighten","Lighten"),a.ColorDodge=new a(18,"colorDodge","Color Dodge"),a.ColorBurn=new a(19,"colorBurn","Color Burn"),a.HardLight=new a(20,"hardLight","Hard Light"),a.SoftLight=new a(21,"softLight","Soft Light"),a.Difference=new a(22,"difference","Difference"),a.Exclusion=new a(23,"exclusion","Exclusion"),a.Multiply=new a(24,"multiply","Multiply"),a.Hue=new a(25,"hue","Hue"),a.Saturation=new a(26,"saturation","Saturation"),a.Color=new a(27,"color","Color"),a.Luminosity=new a(28,"luminosity","Luminosity");},function(t,e,r){r.d(e,"a",function(){return i});var n=r(2),s=r(0);class i extends n.default{constructor(){super(),this._Length=0;}get tipWorldTranslation(){const t=s.a.create();return t[4]=this._Length,s.a.mul(t,this._WorldTransform,t),s.b.set(s.b.create(),t[4],t[5])}get length(){return this._Length}set length(t){this._Length!==t&&(this._Length=t,this.markTransformDirty());}copy(t,e){super.copy(t,e),this._Length=t._Length;}get firstBone(){let t=this._Children;for(let e of t)if(e instanceof i)return e;return null}}},function(t,e,r){r.d(e,"a",function(){return n});class n{static get TransformDirty(){return 1}static get WorldTransformDirty(){return 2}static get PaintDirty(){return 4}}},function(t,e,r){r.d(e,"a",function(){return a});var n=r(2),s=r(8),i=r(6);class a extends n.default{constructor(t){super(t),this._DrawOrder=0,this._BlendMode=s.a.SrcOver,this._IsHidden=!1;}get drawOrder(){return this._DrawOrder}get blendMode(){return this._BlendMode}get isHidden(){return this._IsHidden}set isHidden(t){this._IsHidden=t;}copy(t,e){super.copy(t,e),this._DrawOrder=t._DrawOrder,this._BlendMode=t._BlendMode,this._IsHidden=t._IsHidden;}getClips(){let t=this,e=[];for(;t;)t._Clips&&e.push(t._Clips),t=t.parent;return e}clip(t){const e=this._Actor,r=this.getClips();if(r.length)for(const n of r)for(const r of n){const n=new Set,{node:s,intersect:a}=r;if(s)if(s.all(function(t){t.paths&&!t.renderCollapsed&&n.add(t);}),a)for(const e of n){const r=t.makePath(!0),{fill:n}=e;n&&t.setPathFillType(r,n.fillRule);for(const n of e.paths)t.addPath(r,n.getPath(t),n.getPathTransform());r.isEmpty()||t.clipPath(r);}else for(const r of n){const{fill:n}=r;if(0!==r.paths.length)if(n&&n.fillRule===i.a.EvenOdd){const n=t.makePath(!0),{originWorld:s}=e;n.addRect(s[0],s[1],s[0]+e.width,s[1]+e.height);for(const e of r.paths)t.addPath(n,e.getPath(t),e.getPathTransform());t.setPathFillType(n,i.a.EvenOdd),t.clipPath(n);}else for(const n of r.paths){const r=t.makePath(!0),{originWorld:s}=e;r.addRect(s[0],s[1],s[0]+e.width,s[1]+e.height),t.addPath(r,n.getPath(t),n.getPathTransform()),t.setPathFillType(r,i.a.EvenOdd),t.clipPath(r);}}}}}},function(t,e,r){r.d(e,"a",function(){return n});class n{static get Butt(){return 0}static get Round(){return 1}static get Square(){return 2}}},function(t,e,r){r.d(e,"a",function(){return n});class n{static get Miter(){return 0}static get Round(){return 1}static get Bevel(){return 2}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return n});class n{constructor(){this.events={};}addEventListener(t,e){let r=this.events[t];r||(this.events[t]=r=[]),-1===r.indexOf(e)&&r.push(e);}removeEventListener(t,e){let r=this.events[t];if(!r)return !0;for(let t=0;t<r.length;t++)if(r[t]===e)return r.splice(t,1),!0;return !1}dispatch(t,e,r){let n=this.events[t];if(n)for(let t=0;t<n.length;t++)n[t].call(this,e,r);}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(11);class s extends n.a{makeInstance(t){const e=new s;return e.copy(this,t),e}draw(t){}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(2);class s extends n.default{makeInstance(t){const e=new s;return e.copy(this,t),e}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(5);class s extends n.default{constructor(){super(),this._Width=0,this._Height=0;}get width(){return this._Width}get height(){return this._Height}makeInstance(t){let e=new s;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Width=t._Width,this._Height=t._Height;}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(5);class s extends n.default{constructor(){super(),this._Width=0,this._Height=0;}get width(){return this._Width}get height(){return this._Height}makeInstance(t){let e=new s;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Width=t._Width,this._Height=t._Height;}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(5);class s extends n.default{constructor(){super(),this._Radius=0;}get radius(){return this._Radius}makeInstance(t){let e=new s;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Radius=t._Radius;}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(5);class s extends n.default{constructor(){super(),this._ContourVertices=new Float32Array;}get contourVertices(){return this._ContourVertices}makeInstance(t){let e=new s;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._ContourVertices=t._ContourVertices;}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(5);class s extends n.default{constructor(){super(),this._Vertices=new Float32Array;}get vertices(){return this._Vertices}makeInstance(t){let e=new s;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Vertices=t._Vertices;}}},function(t,e,r){r.r(e),r.d(e,"default",function(){return s});var n=r(14);class s extends n.default{constructor(t,e){super(),this._Actor=t,this._Animation=e,this._Time=0,this._Min=e._DisplayStart||0,this._Max=e._DisplayEnd||e._Duration,this._Loop=e._Loop,this._Range=this._Max-this._Min;}get loop(){return this._Loop}set loop(t){this._Loop=t;}get time(){return this._Time}get isOver(){return this._Time>=this._Max}set time(t){const e=t-this._Time;let r=this._Time+e%this._Range;r<this._Min?r=this._Loop?this._Max-(this._Min-r):this._Min:r>this._Max&&(r=this._Loop?this._Min+(r-this._Max):this._Max),this._Time=r;}reset(){this._Time=0;}advance(t){const e=[],r=this._Actor._Components;let n=this._Time;(n+=t%this._Range)<this._Min?this._Loop?(this._Animation.triggerEvents(r,n,this._Time,e),n=this._Max-(this._Min-n),this._Animation.triggerEvents(r,n,this._Max,e)):(n=this._Min,this._Time!=n&&this._Animation.triggerEvents(r,this._Min,this._Time,e)):n>this._Max?this._Loop?(this._Animation.triggerEvents(r,n,this._Time,e),n=this._Min+(n-this._Max),this._Animation.triggerEvents(r,this._Min-.001,n,e)):(n=this._Max,this._Time!=n&&this._Animation.triggerEvents(r,this._Time,this._Max,e)):n>this._Time?this._Animation.triggerEvents(r,this._Time,n,e):this._Animation.triggerEvents(r,n,this._Time,e);for(let t=0;t<e.length;t++){const r=e[t];this.dispatch("animationEvent",r),this._Actor.dispatch("animationEvent",r);}return this._Time=n,e}apply(t,e){this._Animation.apply(this._Time,t,e);}}},function(t,e){var r=4,n=.001,s=1e-7,i=10,a=11,o=1/(a-1),c="function"==typeof Float32Array;function l(t,e){return 1-3*e+3*t}function h(t,e){return 3*e-6*t}function d(t){return 3*t}function u(t,e,r){return ((l(e,r)*t+h(e,r))*t+d(e))*t}function _(t,e,r){return 3*l(e,r)*t*t+2*h(e,r)*t+d(e)}function f(t){return t}t.exports=function(t,e,l,h){if(!(0<=t&&t<=1&&0<=l&&l<=1))throw new Error("bezier x values must be in [0, 1] range");if(t===e&&l===h)return f;for(var d=c?new Float32Array(a):new Array(a),p=0;p<a;++p)d[p]=u(p*o,t,l);function m(e){for(var c=0,h=1,f=a-1;h!==f&&d[h]<=e;++h)c+=o;var p=c+(e-d[--h])/(d[h+1]-d[h])*o,m=_(p,t,l);return m>=n?function(t,e,n,s){for(var i=0;i<r;++i){var a=_(e,n,s);if(0===a)return e;e-=(u(e,n,s)-t)/a;}return e}(e,p,t,l):0===m?p:function(t,e,r,n,a){var o,c,l=0;do{(o=u(c=e+(r-e)/2,n,a)-t)>0?r=c:e=c;}while(Math.abs(o)>s&&++l<i);return c}(e,c,c+o,t,l)}return function(t){return 0===t?0:1===t?1:u(m(t),e,h)}};},,,,,,,function(t,e,r){e.Graphics=r(3).default,e.ActorLoader=r(31).default,e.AnimationInstance=r(22).default,e.ActorCollider=r(5).default,e.ActorColliderPolygon=r(20).default,e.ActorColliderLine=r(21).default,e.ActorColliderCircle=r(19).default,e.ActorColliderRectangle=r(17).default,e.ActorColliderTriangle=r(18).default,e.ActorBone=r(7).default,e.ActorNode=r(2).default,e.ActorTargetNode=r(16).default,e.ActorLayerNode=r(15).default,e.Dispatcher=r(14).default;},function(t,e,r){function n(t,e){return {id:t,key:e}}r.r(e);const s={Unknown:n(0,"unknown"),PosX:n(1,"posX"),PosY:n(2,"posY"),ScaleX:n(3,"scaleX"),ScaleY:n(4,"scaleY"),Rotation:n(5,"rotation"),Opacity:n(6,"opacity"),DrawOrder:n(7,"drawOrder"),Length:n(8,"length"),ImageVertices:n(9,"imageVertices"),ConstraintStrength:n(10,"strength"),Trigger:n(11,"trigger"),IntProperty:n(12,"intValue"),FloatProperty:n(13,"floatValue"),StringProperty:n(14,"stringValue"),BooleanProperty:n(15,"boolValue"),IsCollisionEnabled:n(16,"isCollisionEnabled"),Sequence:n(17,"sequence"),ActiveChildIndex:n(18,"activeChild"),PathVertices:n(19,"pathVertices"),FillColor:n(20,"fillColor"),FillGradient:n(21,"fillGradient"),FillRadial:n(22,"fillRadial"),StrokeColor:n(23,"strokeColor"),StrokeGradient:n(24,"strokeGradient"),StrokeRadial:n(25,"strokeRadial"),StrokeWidth:n(26,"strokeWidth"),StrokeOpacity:n(27,"strokeOpacity"),FillOpacity:n(28,"fillOpacity"),ShapeWidth:n(29,"width"),ShapeHeight:n(30,"height"),CornerRadius:n(31,"cornerRadius"),InnerRadius:n(32,"innerRadius"),StrokeStart:n(33,"strokeStart"),StrokeEnd:n(34,"strokeEnd"),StrokeOffset:n(35,"strokeOffset")},i={},a=new Map;for(const t in s){const e=s[t];i[t]=e.id,a.set(e.key,e.id);}class o{constructor(t){this._Type=t,this._KeyFrames=[];}static get Types(){return i}static fromString(t){return a.get(t)||0}}o.Properties={};var c=r(7),l=r(1);const h=o.Types;function d(t,e,r,n){let s,i;for(;r<=n;)if((i=e[s=r+n>>1]._Time)<t)r=s+1;else {if(!(i>t))return s;n=s-1;}return r}class u{constructor(t){this._Artboard=t,this._Components=[],this._TriggerComponents=[],this._Name=null,this._FPS=60,this._Duration=0,this._Loop=!1;}get name(){return this._Name}get loop(){return this._Loop}get duration(){return this._Duration}triggerEvents(t,e,r,n){const s=this._TriggerComponents;for(let i=0;i<s.length;i++){const a=s[i],o=a._Properties;for(let s=0;s<o.length;s++){const i=o[s];switch(i._Type){case h.Trigger:{const s=i._KeyFrames;if(0===s.length)continue;const o=d(r,s,0,s.length-1);if(0===o){if(s.length>0&&s[0]._Time===r){const e=t[a._ComponentIndex];n.push({name:e._Name,component:e,propertyType:i._Type,keyFrameTime:r,elapsed:0});}}else for(let c=o-1;c>=0;c--){const o=s[c];if(!(o._Time>e))break;{const e=t[a._ComponentIndex];n.push({name:e._Name,component:e,propertyType:i._Type,keyFrameTime:o._Time,elapsed:r-o._Time});}}break}}}}}apply(t,e,r){const n=this._Components,s=1-r,i=e._Components;for(let a=0;a<n.length;a++){const o=n[a],u=i[o._ComponentIndex];if(!u)continue;const _=o._Properties;for(let n=0;n<_.length;n++){const a=_[n],o=a._KeyFrames;if(0===o.length)continue;const f=d(t,o,0,o.length-1);let p=0;if(0===f)p=o[0]._Value;else if(f<o.length){const e=o[f-1],r=o[f];if(t==r._Time)p=r._Value;else {let n=(t-e._Time)/(r._Time-e._Time);const s=e._Interpolator;s&&(n=s.getEasedMix(n)),p=e.interpolate(n,r);}}else {p=o[f-1]._Value;}let m=!1;switch(a._Type){case h.PosX:u._Translation[0]=1===r?p:u._Translation[0]*s+p*r,m=!0;break;case h.PosY:u._Translation[1]=1===r?p:u._Translation[1]*s+p*r,m=!0;break;case h.ScaleX:u._Scale[0]=1===r?p:u._Scale[0]*s+p*r,m=!0;break;case h.ScaleY:u._Scale[1]=1===r?p:u._Scale[1]*s+p*r,m=!0;break;case h.Rotation:u._Rotation=1===r?p:u._Rotation*s+p*r,m=!0;break;case h.Opacity:u._Opacity=1===r?p:u._Opacity*s+p*r,m=!0;break;case h.ConstraintStrength:u.strength=1===r?p:u._Strength*s+p*r;break;case h.DrawOrder:if(e._LastSetDrawOrder!=p){e._LastSetDrawOrder=p;for(let t=0;t<p.length;t++){const e=p[t];i[e.componentIdx]._DrawOrder=e.value;}e._IsImageSortDirty=!0;}break;case h.Length:m=!0,u._Length=1===r?p:u._Length*s+p*r;for(let t=0;t<u._Children.length;t++){const e=u._Children[t];e.constructor===c.default&&(e._Translation[0]=u._Length,e._IsDirty=!0);}break;case h.ImageVertices:{const t=u._NumVertices,e=u.deformVertices;let n=0;if(1===r)for(let r=0;r<t;r++){const t=e[r];t[0]=p[n++],t[1]=p[n++];}else for(let i=0;i<t;i++){const t=e[i];t[0]=t[0]*s+p[n++]*r,t[1]=t[1]*s+p[n++]*r;}u.invalidateDrawable();break}case h.StringProperty:u._Value=p;break;case h.IntProperty:u._Value=1===r?p:Math.round(u._Value*s+p*r);break;case h.FloatProperty:u._Value=1===r?p:u._Value*s+p*r;break;case h.BooleanProperty:u._Value=p;break;case h.IsCollisionEnabled:u._IsCollisionEnabled=p;break;case h.Sequence:if(u._SequenceFrames){let t=Math.floor(p)%u._SequenceFrames.length;t<0&&(t+=u._SequenceFrames.length),u._SequenceFrame=t;}break;case h.ActiveChildIndex:u.activeChildIndex=p,m=!0;break;case h.PathVertices:{u.invalidateDrawable();let t=0;if(1!==r)for(const e of u._Points)e._Translation[0]=e._Translation[0]*s+p[t++]*r,e._Translation[1]=e._Translation[1]*s+p[t++]*r,e.constructor===l.c?e._Radius=e._Radius*s+p[t++]*r:(e._In[0]=e._In[0]*s+p[t++]*r,e._In[1]=e._In[1]*s+p[t++]*r,e._Out[0]=e._Out[0]*s+p[t++]*r,e._Out[1]=e._Out[1]*s+p[t++]*r);else for(const e of u._Points)e._Translation[0]=p[t++],e._Translation[1]=p[t++],e.constructor===l.c?e._Radius=p[t++]:(e._In[0]=p[t++],e._In[1]=p[t++],e._Out[0]=p[t++],e._Out[1]=p[t++]);break}case h.ShapeWidth:case h.StrokeWidth:u.width=1===r?p:u._Width*s+p*r;break;case h.StrokeStart:u.trimStart=1===r?p:u.trimStart*s+p*r;break;case h.StrokeEnd:u.trimEnd=1===r?p:u.trimEnd*s+p*r;break;case h.StrokeOffset:u.trimOffset=1===r?p:u.trimOffset*s+p*r;break;case h.FillOpacity:case h.StrokeOpacity:u._Opacity=1===r?p:u._Opacity*s+p*r,u.markDirty();break;case h.FillColor:case h.StrokeColor:{const t=u._Color;1===r?(t[0]=p[0],t[1]=p[1],t[2]=p[2],t[3]=p[3]):(t[0]=t[0]*s+p[0]*r,t[1]=t[1]*s+p[1]*r,t[2]=t[2]*s+p[2]*r,t[3]=t[3]*s+p[3]*r),u.markDirty();break}case h.FillGradient:case h.StrokeGradient:if(1===r){let t=0;u._Start[0]=p[t++],u._Start[1]=p[t++],u._End[0]=p[t++],u._End[1]=p[t++];const e=u._ColorStops;let r=0;for(;t<p.length&&r<e.length;)e[r++]=p[t++];}else {let t=0;u._Start[0]=u._Start[0]*s+p[t++]*r,u._Start[1]=u._Start[1]*s+p[t++]*r,u._End[0]=u._End[0]*s+p[t++]*r,u._End[1]=u._End[1]*s+p[t++]*r;const e=u._ColorStops;let n=0;for(;t<p.length&&n<e.length;)e[n]=e[n]*s+p[t++],n++;}u.markDirty();break;case h.FillRadial:case h.StrokeRadial:if(1===r){let t=0;u._SecondaryRadiusScale=p[t++],u._Start[0]=p[t++],u._Start[1]=p[t++],u._End[0]=p[t++],u._End[1]=p[t++];const e=u._ColorStops;let r=0;for(;t<p.length&&r<e.length;)e[r++]=p[t++];}else {let t=0;u._SecondaryRadiusScale=u._SecondaryRadiusScale*s+p[t++]*r,u._Start[0]=u._Start[0]*s+p[t++]*r,u._Start[1]=u._Start[1]*s+p[t++]*r,u._End[0]=u._End[0]*s+p[t++]*r,u._End[1]=u._End[1]*s+p[t++]*r;const e=u._ColorStops;let n=0;for(;t<p.length&&n<e.length;)e[n]=e[n]*s+p[t++],n++;}u.markDirty();break;case h.ShapeHeight:u.height=1===r?p:u._Height*s+p*r;break;case h.CornerRadius:u.cornerRadius=1===r?p:u._CornerRadius*s+p*r;break;case h.InnerRadius:u.innerRadius=1===r?p:u._InnerRadius*s+p*r;}m&&u.markTransformDirty();}}}}class _{constructor(t){this._Bytes=t,this._Image=null;}get img(){return this._Image}get width(){return this._Image.width()}get height(){return this._Image.height()}get paint(){return this._Paint}initialize(t){const e=t.makeImage(this._Bytes),r=t.makeImageShader(e);this._Image=e;const n=t.makePaint();t.setPaintShader(n,r),this._Paint=n;}}class f{constructor(){}readFloat32(){}readFloat32Array(t,e){}readFloat32ArrayOffset(t,e,r){}readFloat64(){}isEOF(){}readInt8(){}readUint8(){}readUint8Length(){}readUint16(){}readUint16Array(t,e){}readUint16Length(){}readInt16(){}readUint32(){}readUint32Length(){}readInt32(){}byteArrayToString(t){}readString(){}readRaw(t,e){}readBool(){}readBlockType(){}readImage(t,e){}readId(t){}openArray(t){}closeArray(){}openObject(t){}closeObject(){}get containerType(){return "stream"}}class p extends f{constructor(t){super(),this.isBigEndian=function(){const t=new ArrayBuffer(4),e=new Uint32Array(t),r=new Uint8Array(t);return e[0]=3735928559,222==r[0]}(),this.raw=t,this.dataView=new DataView(t.buffer),this.readIndex=0;}readFloat32(){const t=this.dataView.getFloat32(this.readIndex,!this.isBigEndian);return this.readIndex+=4,t}readFloat32ArrayOffset(t,e,r){r||(r=0),e||(e=t.length);let n=r+e;for(let e=r;e<n;e++)t[e]=this.dataView.getFloat32(this.readIndex,!this.isBigEndian),this.readIndex+=4;return t}readFloat32Array(t){for(let e=0;e<t.length;e++)t[e]=this.dataView.getFloat32(this.readIndex,!this.isBigEndian),this.readIndex+=4;return t}readFloat64(){const t=this.dataView.getFloat64(this.readIndex,!this.isBigEndian);return this.readIndex+=8,t}readUint8(){return this.raw[this.readIndex++]}isEOF(){return this.readIndex>=this.raw.length}readInt8(){const t=this.dataView.getInt8(this.readIndex);return this.readIndex+=1,t}readUint16(){const t=this.dataView.getUint16(this.readIndex,!this.isBigEndian);return this.readIndex+=2,t}readUint16Array(t){const{length:e}=t;for(let r=0;r<e;r++)t[r]=this.dataView.getUint16(this.readIndex,!this.isBigEndian),this.readIndex+=2;return t}readInt16(){const t=this.dataView.getInt16(this.readIndex,!this.isBigEndian);return this.readIndex+=2,t}readUint32(){const t=this.dataView.getUint32(this.readIndex,!this.isBigEndian);return this.readIndex+=4,t}readInt32(){const t=this.dataView.getInt32(this.readIndex,!this.isBigEndian);return this.readIndex+=4,t}byteArrayToString(t){let e=[],r=0,n=0;for(;r<t.length;){let s=t[r++];if(s<128)e[n++]=String.fromCharCode(s);else if(s>191&&s<224){let i=t[r++];e[n++]=String.fromCharCode((31&s)<<6|63&i);}else if(s>239&&s<365){let i=((7&s)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536;e[n++]=String.fromCharCode(55296+(i>>10)),e[n++]=String.fromCharCode(56320+(1023&i));}else {let i=t[r++],a=t[r++];e[n++]=String.fromCharCode((15&s)<<12|(63&i)<<6|63&a);}}return e.join("")}readString(){const t=this.readUint32(),e=new Uint8Array(t);for(let r=0;r<t;r++)e[r]=this.raw[this.readIndex++];return this.byteArrayToString(e)}readRaw(t,e){for(let r=0;r<e;r++)t[r]=this.raw[this.readIndex++];}readBool(){return 1===this.readUint8()}readBlockType(){return this.readUint8()}readImage(t,e){if(t){const t=this.readString(),r=new XMLHttpRequest;r.open("GET",t,!0),r.responseType="arraybuffer",r.onload=function(){e(this.response);},r.send();}else {const t=this.readUint32(),r=new Uint8Array(t);this.readRaw(r,r.length),e(r);}}readId(t){return this.readUint16()}readUint8Length(){return this.readUint8()}readUint16Length(){return this.readUint16()}readUint32Length(){return this.readUint32()}get containerType(){return "bin"}}p.alignment=1024;class m extends f{constructor(t){super(),this._readObject=t.container,this._context=[this._readObject];}readProp(t){const e=this._last;if(e.constructor===Object){const r=e[t];return delete e[t],r}if(e.constructor===Array)return e.shift()}readFloat32(t){return this.readProp(t)}readFloat32Array(t,e){return this.readArray(t,e)}readFloat32ArrayOffset(t,e,r,n){return this.readFloat32Array(t,n)}readArray(t,e){const r=this.readProp(e);for(let e=0;e<t.length;e++)t[e]=r[e];return t}readFloat64(t){return this.readProp(t)}readUint8(t){return this.readProp(t)}readUint8Length(){return this._readLength()}isEOF(){return this._context.length<=1&&0===Object.keys(this._readObject).length}readInt8(t){return this.readProp(t)}readUint16(t){return this.readProp(t)}readUint16Array(t,e){return this.readArray(t,e)}readInt16(t){return this.readProp(t)}readUint16Length(){return this._readLength()}readUint32(t){return this.readProp(t)}byteArrayToString(t){let e=[],r=0,n=0;for(;r<t.length;){let s=t[r++];if(s<128)e[n++]=String.fromCharCode(s);else if(s>191&&s<224){let i=t[r++];e[n++]=String.fromCharCode((31&s)<<6|63&i);}else if(s>239&&s<365){let i=((7&s)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536;e[n++]=String.fromCharCode(55296+(i>>10)),e[n++]=String.fromCharCode(56320+(1023&i));}else {let i=t[r++],a=t[r++];e[n++]=String.fromCharCode((15&s)<<12|(63&i)<<6|63&a);}}return e.join("")}readString(t){return this.readProp(t)}readBool(t){return this.readProp(t)}readRaw(t,e,r){const n=this._last,s=this._peekNext();t.container=s,n.constructor===Object?delete n[this._nextKey]:n.constructor===Array&&n.shift();}readBlockType(t){const e=this._peekNext();let r;if(e.constructor===Object){const n=this._last;let s;n.constructor===Object?s=this._nextKey:n.constructor===Array&&(s=e.type),r=t.fromString(s)||s;}else if(e.constructor===Array){const e=this._nextKey;r=t.fromString(e)||e;}return r}readImage(t,e){const r=this.readString();if(t){const t=new XMLHttpRequest;t.open("GET",r,!0),t.responseType="arraybuffer",t.onload=function(){e(this.response);},t.send();}else e(function(t){const e=atob(t.split(",")[1]),r=(t.split(",")[0].split(":")[1].split(";")[0],new ArrayBuffer(e.length)),n=new Uint8Array(r);for(let t=0;t<e.length;t++)n[t]=e.charCodeAt(t);return r}(r));}readId(t){const e=this.readUint16(t);return void 0!==e?e+1:0}openArray(t){const e=this.readProp(t);this._context.unshift(e);}closeArray(){this._context.shift();}openObject(t){const e=this.readProp(t);this._context.unshift(e);}closeObject(){this._context.shift();}get containerType(){return "json"}_peekNext(){const t=this._last;let e;return t.constructor===Object?e=t[this._nextKey]:t.constructor===Array&&(e=t[0]),e}get _nextKey(){return Object.keys(this._last)[0]}_readLength(){const t=this._last;return t.constructor===Array?t.length:t.constructor===Object?Object.keys(t).length:void 0}get _last(){return this._context[0]}}var g=r(14);class y extends g.default{constructor(){super(),this._Artboards=[],this._NestedActorAssets=[],this._Atlases=[];}getArtboard(t){return this._Artboards.find(e=>e._Name===t)}dispose(t){for(const e of this._Artboards)e.dispose(t);}initialize(t){for(let e of this._NestedActorAssets)e.actor&&e.actor.initialize(t);for(const e of this._Atlases)e.initialize(t);for(const e of this._Artboards)e.initialize(t);}makeInstance(){return this._Artboards.length&&this._Artboards[0].makeInstance()||null}get animations(){return this._Artboards.length&&this._Artboards[0]._Animations||null}}var b=r(4);class S extends b.a{constructor(){super();}makeInstance(t){const e=new S;return e.copy(this,t),e}copy(t,e){super.copy(t,e);}}var C=r(2),I=r(16),A=r(15);class M extends C.default{constructor(){super(),this._ActiveChildIndex=0;}setActiveChildIndex(t){this._ActiveChildIndex=Math.min(this._Children.length,Math.max(0,t));for(let t=0;t<this._Children.length;++t){const e=this._Children[t],r=t!==this._ActiveChildIndex-1;e.setCollapsedVisibility(r);}}set activeChildIndex(t){t!==this._ActiveChildIndex&&this.setActiveChildIndex(t);}get activeChildIndex(){return this._ActiveChildIndex}makeInstance(t){let e=new M;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._ActiveChildIndex=t._ActiveChildIndex;}completeResolve(){super.completeResolve(),this.setActiveChildIndex(this._ActiveChildIndex);}}var T=r(11),w=r(10),k=r(0);const{WorldTransformDirty:P}=w.a;class v extends T.a{constructor(t){super(t),this._Paths=[],this._Fills=null,this._Strokes=null,this._TransformAffectsStroke=!1;}get fill(){const{_Fills:t}=this;return t&&t.length&&t[0]||null}get transformAffectsStroke(){return this._TransformAffectsStroke}get paths(){return this._Paths}addFill(t){this._Fills||(this._Fills=[]),this._Fills.push(t);}addStroke(t){this._Strokes||(this._Strokes=[]),this._Strokes.push(t);}get stroke(){return this._Strokes&&this._Strokes.length&&this._Strokes[0]}initialize(t,e){}computeAABB(){const t=this.getClips();if(t.length){let e=null;for(const r of t)for(const t of r){const{node:r}=t;r&&r.all(function(t){if(t.constructor===v){let r=t.computeAABB();e?(r[0]<e[0]&&(e[0]=r[0]),r[1]<e[1]&&(e[1]=r[1]),r[2]>e[2]&&(e[2]=r[2]),r[3]>e[3]&&(e[3]=r[3])):e=r;}});}return e}let e=null,r=0;if(this._Strokes)for(const t of this._Strokes)t.width>r&&(r=t.width);for(const t of this._Paths){if(t.numPoints<2)continue;const r=t.getPathAABB();e?(e[0]=Math.min(e[0],r[0]),e[1]=Math.min(e[1],r[1]),e[2]=Math.max(e[2],r[2]),e[3]=Math.max(e[3],r[3])):e=r;}const n=r/2;e[0]-=n,e[1]-=n,e[2]+=n,e[3]+=n;let s=Number.MAX_VALUE,i=Number.MAX_VALUE,a=-Number.MAX_VALUE,o=-Number.MAX_VALUE;if(!e)return null;let c=this._WorldTransform;const l=[k.b.set(k.b.create(),e[0],e[1]),k.b.set(k.b.create(),e[2],e[1]),k.b.set(k.b.create(),e[2],e[3]),k.b.set(k.b.create(),e[0],e[3])];for(let t=0;t<l.length;t++){const e=l[t],r=k.b.transformMat2d(e,e,c);r[0]<s&&(s=r[0]),r[1]<i&&(i=r[1]),r[0]>a&&(a=r[0]),r[1]>o&&(o=r[1]);}return new Float32Array([s,i,a,o])}dispose(t,e){}draw(t){if(this._RenderCollapsed||this._IsHidden)return;t.save(),this.clip(t);const{_TransformAffectsStroke:e,worldTransform:r}=this,n=e?this.getShapePathLocal(t):this.getShapePath(t);e&&t.transform(r);const{_Fills:s,_Strokes:i}=this;if(s)for(const e of s)e.fill(t,n);if(i)for(const e of i)e._Width>0&&e.stroke(t,n);t.restore();}invalidatePath(){const{stroke:t}=this;t&&t.markPathEffectsDirty();}getShapePath(t){const e=this._Paths,r=t.makePath(!0);for(const n of e)n.isHidden||t.addPath(r,n.getPath(t),n.getPathTransform());return r}getShapePathLocal(t){const e=this._Paths,r=t.makePath(!0),{worldTransform:n}=this,s=k.a.create();if(!k.a.invert(s,n))return r;for(const n of e){if(n.isHidden)continue;const e=k.a.mul(k.a.create(),s,n.getPathTransform());t.addPath(r,n.getPath(t),e);}return r}update(t){super.update(t),(t&P)===P&&this.invalidatePath();}addPath(t){const{_Paths:e}=this;return -1===e.indexOf(t)&&(e.push(t),!0)}removePath(t){const{_Paths:e}=this,r=e.indexOf(t);return -1!==r&&(e.splice(r,1),!0)}makeInstance(t){const e=new v;return e._IsInstance=!0,e.copy(this,t),e}copy(t,e){super.copy(t,e),this._TransformAffectsStroke=t._TransformAffectsStroke;}}const x=1-.552284749831,O=t=>(class extends t{constructor(t){super(t),this._Shape=null,this._IsRootPath=!1;}get isRootPath(){return this._IsRootPath}get shape(){return this._Shape}get isConnectedToBones(){return !1}updateShape(){const{_Shape:t}=this;t&&t.removePath(this);let e=this.parent;for(;e&&e.constructor!==v;)e=e.parent;this._Shape=e,this._IsRootPath=e===this.parent,e&&e.addPath(this);}completeResolve(){super.completeResolve(),this.updateShape();}getPathOBB(){let t=Number.MAX_VALUE,e=Number.MAX_VALUE,r=-Number.MAX_VALUE,n=-Number.MAX_VALUE;const{deformedPoints:s,isClosed:i}=this,a=D(s,i);for(let s of a){let i=s.translation,a=i[0],o=i[1];if(a<t&&(t=a),o<e&&(e=o),a>r&&(r=a),o>n&&(n=o),s.pointType!==l.b.Straight){let i=s.in;a=i[0],o=i[1],a<t&&(t=a),o<e&&(e=o),a>r&&(r=a),o>n&&(n=o),a=(i=s.out)[0],o=i[1],a<t&&(t=a),o<e&&(e=o),a>r&&(r=a),o>n&&(n=o);}}return [t,e,r,n]}getPathAABB(){let t=Number.MAX_VALUE,e=Number.MAX_VALUE,r=-Number.MAX_VALUE,n=-Number.MAX_VALUE;const s=this.getPathOBB(),i=[k.b.fromValues(s[0],s[1]),k.b.fromValues(s[2],s[1]),k.b.fromValues(s[2],s[3]),k.b.fromValues(s[0],s[3])];let{_Transform:a,isConnectedToBones:o,isRootPath:c}=this;if(o)a=k.a.invert(k.a.create(),this.shape._WorldTransform);else if(!c){let t=k.a.create();k.a.invert(t,this.shape._WorldTransform)&&(a=k.a.multiply(k.a.create(),t,this._WorldTransform));}for(let s=0;s<i.length;s++){const o=i[s],c=a?k.b.transformMat2d(o,o,a):o;c[0]<t&&(t=c[0]),c[1]<e&&(e=c[1]),c[0]>r&&(r=c[0]),c[1]>n&&(n=c[1]);}return [t,e,r,n]}});function D(t,e){let r=[];if(t.length){let n=t.length,s=e?t[t.length-1]:null;for(let i=0;i<t.length;i++){let a=t[i];switch(a.pointType){case l.b.Straight:{const o=a.radius;if(o>0)if(e||0!==i&&i!==n-1){let e=t[(i+1)%n];s=s.pointType===l.b.Straight?s.translation:s.out,e=e.pointType===l.b.Straight?e.translation:e.in;let c=a.translation,h=k.b.subtract(k.b.create(),s,c),d=k.b.length(h);h[0]/=d,h[1]/=d;let u=k.b.subtract(k.b.create(),e,c),_=k.b.length(u);u[0]/=_,u[1]/=_;let f=Math.min(d,Math.min(_,o)),p=k.b.scaleAndAdd(k.b.create(),c,h,f),m={e:!0,o:a.o||a,n:s,pointType:l.b.Disconnected,translation:p,out:k.b.scaleAndAdd(k.b.create(),c,h,x*f),in:p};r.push(m),p=k.b.scaleAndAdd(k.b.create(),c,u,f),s={e:!0,o:a.o||a,n:e,pointType:l.b.Disconnected,translation:p,in:k.b.scaleAndAdd(k.b.create(),c,u,x*f),out:p},r.push(s);}else r.push(a),s=a;else r.push(a),s=a;break}case l.b.Mirror:case l.b.Disconnected:case l.b.Asymmetric:r.push(a),s=a;}}}return r}var F=r(3);class R extends(O(C.default)){constructor(t){super(t),this._Width=0,this._Height=0,this._RenderPath=null,this._IsRenderPathDirty=!0;}initialize(t,e){this._RenderPath=e.makePath();}invalidatePath(){this._IsRenderPathDirty=!0,this._RenderPath.setIsVolatile(!0),this.shape.invalidatePath();}get width(){return this._Width}set width(t){this._Width!==t&&(this._Width=t,this.invalidatePath());}get height(){return this._Height}set height(t){this._Height!==t&&(this._Height=t,this.invalidatePath());}resolveComponentIndices(t){C.default.prototype.resolveComponentIndices.call(this,t);}makeInstance(t){const e=R();return R.prototype.copy.call(e,this,t),e}getPathTransform(){return this._WorldTransform}getPathRenderTransform(){return this.worldTransform}get deformedPoints(){return this.getPathPoints()}get isClosed(){return !0}getPath(t){let{_IsRenderPathDirty:e,_RenderPath:r}=this;return e?(r?r.rewind():this._RenderPath=r=t.makePath(),this._IsRenderPathDirty=!1,F.default.pointPath(r,D(this.getPathPoints(),!0),!0)):r}getPathAABB(){let t=Number.MAX_VALUE,e=Number.MAX_VALUE,r=Number.MIN_VALUE,n=Number.MIN_VALUE;const s=this._Transform;function i(i){s&&(i=k.b.transformMat2d(k.b.create(),i,s)),i[0]<t&&(t=i[0]),i[1]<e&&(e=i[1]),i[0]>r&&(r=i[0]),i[1]>n&&(n=i[1]);}const a=this._Width/2,o=this._Height/2;return i([-a,-o]),i([a,-o]),i([-a,o]),i([a,o]),[t,e,r,n]}copy(t,e){super.copy(t,e),this._Width=t._Width,this._Height=t._Height;}}const B=.552284749831;class E extends R{constructor(t){super(t);}makeInstance(t){const e=new E;return e.copy(this,t),e}getPathPoints(){let t=[];const e=Math.max(0,this.width/2),r=Math.max(0,this.height/2);return t.push({pointType:l.b.Disconnected,in:[-e*B,-r],translation:[0,-r],out:[e*B,-r]}),t.push({pointType:l.b.Disconnected,in:[e,-r*B],translation:[e,0],out:[e,r*B]}),t.push({pointType:l.b.Disconnected,in:[e*B,r],translation:[0,r],out:[-e*B,r]}),t.push({pointType:l.b.Disconnected,in:[-e,r*B],translation:[-e,0],out:[-e,-r*B]}),t}}class V extends R{constructor(t){super(t),this._Sides=5;}resolveComponentIndices(t){R.prototype.resolveComponentIndices.call(this,t);}makeInstance(t){const e=new V;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Sides=t._Sides;}getPathPoints(){const t=[],e=this.width/2,r=this.height/2,n=this._Sides;let s=-Math.PI/2;const i=2*Math.PI/n;for(let a=0;a<n;a++)t.push({pointType:l.b.Straight,translation:[Math.cos(s)*e,Math.sin(s)*r]}),s+=i;return t}getPathAABB(){let t=Number.MAX_VALUE,e=Number.MAX_VALUE,r=-Number.MAX_VALUE,n=-Number.MAX_VALUE;const s=this._WorldTransform;function i(i){s&&(i=k.b.transformMat2d(k.b.create(),i,s)),i[0]<t&&(t=i[0]),i[1]<e&&(e=i[1]),i[0]>r&&(r=i[0]),i[1]>n&&(n=i[1]);}const a=this._Sides,o=this.width/2,c=this.height/2;let l=-Math.PI/2,h=2*Math.PI/a;i([0,-c]);for(let t=0;t<a;t++)i([Math.cos(l)*o,Math.sin(l)*c]),l+=h;return [k.b.fromValues(t,e),k.b.fromValues(r,n)]}}class L extends R{constructor(t){super(t),this._CornerRadius=0;}get cornerRadius(){return this._CornerRadius}set cornerRadius(t){this._CornerRadius!==t&&(this._CornerRadius=t,this.invalidatePath());}resolveComponentIndices(t){R.prototype.resolveComponentIndices.call(this,t);}makeInstance(t){const e=new L;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._CornerRadius=t._CornerRadius;}getPathPoints(){const{width:t,height:e,cornerRadius:r}=this,n=t/2,s=e/2;let i=r||0;return t<2*i&&(i=t/2),e<2*i&&(i=e/2),[{pointType:l.b.Straight,translation:[-n,-s],radius:i},{pointType:l.b.Straight,translation:[n,-s],radius:i},{pointType:l.b.Straight,translation:[n,s],radius:i},{pointType:l.b.Straight,translation:[-n,s],radius:i}]}}class U extends R{constructor(t){super(t),this._Points=5,this._InnerRadius=0;}get innerRadius(){return this._InnerRadius}set innerRadius(t){this._InnerRadius!==t&&(this._InnerRadius=t,this.invalidatePath());}makeInstance(t){const e=new U;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Points=t._Points,this._InnerRadius=t._InnerRadius;}getOBB(t){let e=Number.MAX_VALUE,r=Number.MAX_VALUE,n=-Number.MAX_VALUE,s=-Number.MAX_VALUE;function i(i){t&&(i=k.b.transformMat2d(k.b.create(),i,t)),i[0]<e&&(e=i[0]),i[1]<r&&(r=i[1]),i[0]>n&&(n=i[0]),i[1]>s&&(s=i[1]);}const a=this.width/2,o=this.height/2;let c=-Math.PI/2;const l=2*Math.PI/this.sides,h=[a,a*this._InnerRadius],d=[o,o*this._InnerRadius];i([0,-o]);for(let t=0;t<this.sides;t++)i([Math.cos(c)*h[t%2],Math.sin(c)*d[t%2]]),c+=l;return [k.b.fromValues(e,r),k.b.fromValues(n,s)]}getPathPoints(){const{_Points:t,_InnerRadius:e}=this,r=2*t;let n=[];const s=Math.max(0,this.width/2),i=Math.max(0,this.height/2);let a=-Math.PI/2,o=2*Math.PI/r,c=[s,s*e],h=[i,i*e];for(let t=0;t<r;t++)n.push({pointType:l.b.Straight,translation:[Math.cos(a)*c[t%2],Math.sin(a)*h[t%2]]}),a+=o;return n}get sides(){return 2*this._Points}}class N extends R{constructor(t){super(t);}makeInstance(t){const e=new N;return e.copy(this,t),e}getOBB(t){let e=Number.MAX_VALUE,r=Number.MAX_VALUE,n=-Number.MAX_VALUE,s=-Number.MAX_VALUE;function i(i){t&&(i=k.b.transformMat2d(k.b.create(),i,t)),i[0]<e&&(e=i[0]),i[1]<r&&(r=i[1]),i[0]>n&&(n=i[0]),i[1]>s&&(s=i[1]);}const a=this.width/2,o=this.height/2;return i([0,-o-10]),i([a,o]),i([-a,o]),[k.b.fromValues(e,r),k.b.fromValues(n,s)]}getPathPoints(){let t=[];const e=this.width/2,r=this.height/2;return t.push({pointType:l.b.Straight,translation:[0,-r]}),t.push({pointType:l.b.Straight,translation:[e,r]}),t.push({pointType:l.b.Straight,translation:[-e,r]}),t}}var W=r(9);class X extends W.a{makeInstance(t){const e=new X;return e.copy(this,t),e}}const G=16,H=4*(Math.sqrt(2)-1)/3*Math.sqrt(2)*.5;function q(t,e,r,n,s,i,a){let o=i;const c=3*(e-t)/o,l=3*(t-2*e+r)/(o*=i),h=(n-t+3*(e-r))/(o*=i);t=t,e=c+l+h,r=2*l+6*h,n=6*h;for(let o=0;o<=i;o++)s[o][a]=t,t+=e,e+=r,r+=n;}const Y=.001;function j(t,e){const r=t[0],n=t[1],s=e[0],i=e[1];return Math.abs(r-s)<=Y*Math.max(1,Math.abs(r),Math.abs(s))&&Math.abs(n-i)<=Y*Math.max(1,Math.abs(n),Math.abs(i))}class z extends b.a{constructor(){super(),this._EaseIn=0,this._EaseOut=0,this._ScaleIn=0,this._ScaleOut=0,this._InTargetIdx=0,this._OutTargetIdx=0,this._InTarget=null,this._OutTarget=null,this._Bones=[],this._InPoint=k.b.create(),this._InDirection=k.b.create(),this._OutPoint=k.b.create(),this._OutDirection=k.b.create();}makeInstance(t){const e=new z;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._EaseIn=t._EaseIn,this._EaseOut=t._EaseOut,this._ScaleIn=t._ScaleIn,this._ScaleOut=t._ScaleOut,this._InTargetIdx=t._InTargetIdx,this._OutTargetIdx=t._OutTargetIdx;}resolveComponentIndices(t){super.resolveComponentIndices(t),0!==this._InTargetIdx&&(this._InTarget=t[this._InTargetIdx]),0!==this._OutTargetIdx&&(this._OutTarget=t[this._OutTargetIdx]);const{_Actor:e,_Parent:r}=this;let n=[];if(r){e.addDependency(this,r),n=n.concat(Array.from(r.allConstraints));let t=r.firstBone;t&&(e.addDependency(this,t),n=n.concat(Array.from(t.allConstraints)),!this.outTarget&&t.jelly&&t.jelly.inTarget&&(e.addDependency(this,t.jelly.inTarget),n=n.concat(Array.from(t.jelly.inTarget.allConstraints))));let s=r.parent instanceof W.a&&r.parent,i=s&&s.jelly;i&&i.outTarget&&(e.addDependency(this,i.outTarget),n=n.concat(Array.from(i.outTarget.allConstraints)));}this._InTarget&&(e.addDependency(this,this._InTarget),n=n.concat(Array.from(this._InTarget.allConstraints))),this._OutTarget&&(e.addDependency(this,this._OutTarget),n=n.concat(Array.from(this._OutTarget.allConstraints))),n=new Set(n);for(const t of n)e.addDependency(this,t);}completeResolve(){super.completeResolve();const{_Actor:t,_Parent:e}=this;e._Jelly=this;const r=e._Children;if(r)for(const e of r)e.constructor===X&&(this._Bones.push(e),t.addDependency(e,this));}updateJellies(){const t=this._Parent,e=k.b.set(k.b.create(),t._Length,0),r=this._Cache,n=this._Bones;if(!n)return;if(r&&j(r.tip,e)&&j(r.out,this._OutPoint)&&j(r.in,this._InPoint)&&r.sin===this._ScaleIn&&r.sout===this._ScaleOut)return;this._Cache={tip:e,out:k.b.clone(this._OutPoint),in:k.b.clone(this._InPoint),sin:this._ScaleIn,sout:this._ScaleOut};const s=k.b.create(),i=this._InPoint,a=this._OutPoint,o=e,c=G,l=[];for(let t=0;t<=c;t++)l.push(new Float32Array(2));q(s[0],i[0],a[0],o[0],l,c,0),q(s[1],i[1],a[1],o[1],l,c,1);const h=function(t,e){const r=[],n=t.length,s=new Float32Array(n);s[0]=0;for(let e=0;e<n-1;e++){const r=t[e],n=t[e+1];s[e+1]=s[e]+k.b.distance(r,n);}const i=s[n-1]/e;let a=1;for(let o=1;o<=e;o++){const e=i*o;for(;a<n-1&&s[a]<e;)a++;const c=s[a],l=(c-e)/(c-s[a-1]),h=1-l,d=t[a-1],u=t[a];r.push([d[0]*l+u[0]*h,d[1]*l+u[1]*h]);}return r}(l,n.length);let d=l[0],u=this._ScaleIn;const _=(this._ScaleOut-this._ScaleIn)/(n.length-1);for(let t=0;t<h.length;t++){const e=n[t],r=h[t];k.b.copy(e._Translation,d),e._Length=k.b.distance(r,d),e._Scale[1]=u,u+=_;const s=k.b.subtract(k.b.create(),r,d);e._Rotation=Math.atan2(s[1],s[0]),e.markTransformDirty(),d=r;}}get tipPosition(){const t=this._Parent;return k.b.set(k.b.create(),t._Length,0)}update(t){const e=this._Parent,r=e.parent instanceof W.a&&e.parent,n=r&&r.jelly,s=k.a.invert(k.a.create(),e.worldTransform);if(s){if(this._InTarget){const t=this._InTarget.worldTranslation;k.b.transformMat2d(this._InPoint,t,s),k.b.normalize(this._InDirection,this._InPoint);}else if(r){if(r._FirstBone===e&&n&&n._OutTarget){const t=n._OutTarget.worldTranslation,e=k.b.transformMat2d(k.b.create(),t,s);k.b.normalize(e,e),k.b.negate(this._InDirection,e);}else {const t=k.b.set(k.b.create(),1,0),n=k.b.set(k.b.create(),1,0);k.b.transformMat2(t,t,r.worldTransform),k.b.transformMat2(n,n,e.worldTransform);const i=k.b.add(k.b.create(),t,n),a=k.b.transformMat2(this._InDirection,i,s);k.b.normalize(a,a);}k.b.scale(this._InPoint,this._InDirection,this._EaseIn*e._Length*H);}else k.b.set(this._InDirection,1,0),k.b.set(this._InPoint,this._EaseIn*e._Length*H,0);if(this._OutTarget){const t=this._OutTarget.worldTranslation;k.b.transformMat2d(this._OutPoint,t,s);const r=k.b.set(k.b.create(),e._Length,0);k.b.subtract(this._OutDirection,this._OutPoint,r),k.b.normalize(this._OutDirection,this._OutDirection);}else if(e._FirstBone){const t=e._FirstBone,r=t.jelly;if(r&&r._InTarget){const e=r._InTarget.worldTranslation,n=k.b.subtract(k.b.create(),t.worldTranslation,e);k.b.transformMat2(this._OutDirection,n,s);}else {const r=k.b.set(k.b.create(),1,0),n=k.b.set(k.b.create(),1,0);k.b.transformMat2(r,r,t.worldTransform),k.b.transformMat2(n,n,e.worldTransform);const i=k.b.add(k.b.create(),r,n);k.b.negate(i,i),k.b.transformMat2(this._OutDirection,i,s);}k.b.normalize(this._OutDirection,this._OutDirection);const n=k.b.scale(k.b.create(),this._OutDirection,this._EaseOut*e._Length*H);k.b.set(this._OutPoint,e._Length,0),k.b.add(this._OutPoint,this._OutPoint,n);}else {k.b.set(this._OutDirection,-1,0);const t=k.b.scale(k.b.create(),this._OutDirection,this._EaseOut*e._Length*H);k.b.set(this._OutPoint,e._Length,0),k.b.add(this._OutPoint,this._OutPoint,t);}this.updateJellies();}else console.warn("Failed to invert transform space",e.worldTransform);}}class K extends C.default{constructor(){super();}makeInstance(t){const e=new K;return e.copy(this,t),e}copy(t,e){super.copy(t,e);}}var J=t=>(class extends t{constructor(){super(),this._ConnectedBones=null,this._Skin=null;}setSkin(t){this._Skin=t;}get skin(){return this._Skin}get connectedBones(){return this._ConnectedBones}get isConnectedToBones(){return this._ConnectedBones&&this._ConnectedBones.length>0}resolveComponentIndices(t){if(super.resolveComponentIndices(t),this._ConnectedBones)for(let e=0;e<this._ConnectedBones.length;e++){const r=this._ConnectedBones[e];r.node=t[r.componentIndex];}}copy(t,e){if(super.copy(t,e),t._ConnectedBones){this._ConnectedBones=[];for(const e of t._ConnectedBones)this._ConnectedBones.push({componentIndex:e.componentIndex,bind:e.bind,ibind:e.ibind});}}});class Q extends(J(T.a)){constructor(){super(),this._AtlasIndex=-1,this._NumVertices=0,this._Vertices=null,this._Triangles=null,this._IsInstance=!1,this._VertexBuffer=null,this._IndexBuffer=null,this._DeformVertexBuffer=null,this._SequenceFrames=null,this._SequenceFrame=0,this._SequenceUVs=null,this._SequenceUVBuffer=null,this._skUV=null,this._skPos=null,this._Weights=null,this._Atlas=null;}invalidateDrawable(){this._SkVertices&&(this._SkVertices.delete(),this._SkVertices=null);}get deformVertices(){return this._skPos}computeAABB(){const t=this.computeWorldVertices(),e=t.length;let r=Number.MAX_VALUE,n=Number.MAX_VALUE,s=-Number.MAX_VALUE,i=-Number.MAX_VALUE;for(let a=0;a<e;a++){let e=t[a],o=e[0],c=e[1];o<r&&(r=o),c<n&&(n=c),o>s&&(s=o),c>i&&(i=c);}return new Float32Array([r,n,s,i])}skinVertices(t,e){const{skin:r,_Weights:n}=this;let s=0;const i=this._WorldTransform,a=r.boneMatrices;for(let r=0,o=t.length;r<o;r++){let o=t[r],c=o[0],l=o[1];const h=i[0]*c+i[2]*l+i[4],d=i[1]*c+i[3]*l+i[5],u=new Float32Array(6);for(let t=0;t<4;t++){const e=n[s+t],r=n[s+t+4],i=6*e;for(let t=0;t<6;t++)u[t]+=a[i+t]*r;}s+=8,c=u[0]*h+u[2]*d+u[4],l=u[1]*h+u[3]*d+u[5],e.push(k.b.fromValues(c,l));}return e}computeWorldVertices(t){const e=this._skPos,r=[],{isConnectedToBones:n}=this;if(n)this.skinVertices(e,r);else {const t=this._WorldTransform;for(let n=0,s=this._NumVertices;n<s;n++){e[n];const s=e[0],i=e[1];r.push(k.b.fromValues(t[0]*s+t[2]*i+t[4],t[1]*s+t[3]*i+t[5]));}}return r}dispose(t,e){this._IsInstance?this._DeformVertexBuffer&&(this._DeformVertexBuffer.dispose(),this._DeformVertexBuffer=null):(this._VertexBuffer&&(this._VertexBuffer.dispose(),this._VertexBuffer=null),this._IndexBuffer&&(this._IndexBuffer.dispose(),this._IndexBuffer=null),this._SequenceUVBuffer&&(this._SequenceUVBuffer.dispose(),this._SequenceUVBuffer=null));}initialize(t,e){const{actor:r}=t;if(this._Atlas=this._AtlasIndex>-1&&this._AtlasIndex<r._Atlases.length?r._Atlases[this._AtlasIndex]:null,!this._Atlas||!this._Atlas.img)return;const{width:n,height:s}=this._Atlas,{_VertexStride:i,_Vertices:a,_NumVertices:o}=this;if(a){const t=[],e=[],r=12===i?new Float32Array(8*o):null;let c=0;for(let o=0,l=a.length;o<l;o+=i)if(e.push(k.b.fromValues(a[o],a[o+1])),t.push(k.b.fromValues(a[o+2]*n,a[o+3]*s)),r){const t=o+4;for(let e=0;e<8;e++)r[c++]=a[t+e];}this._skUV=t,this._skPos=e,this._Weights=r;}}getVertices(t){if(this._SkVertices)return this._SkVertices;const{_skUV:e,_skPos:r,_Triangles:n,isConnectedToBones:s}=this;if(!e||!r||!n)return null;const i=t.makeVertices(s?this.skinVertices(r,[]):r,e,n);return this._SkVertices=i,i}draw(t){if(this._RenderCollapsed||this._IsHidden)return;const e=this.getVertices(t);if(!e)return;const{paint:r}=this._Atlas;t.save(),this.clip(t),this.isConnectedToBones||t.transform(this.worldTransform),F.default.setPaintBlendMode(r,this._BlendMode),t.setPaintColor(r,[1,1,1,this._RenderOpacity]),t.drawVertices(e,r),t.restore();}makeInstance(t){const e=new Q;return e._IsInstance=!0,e.copy(this,t),e}copy(t,e){super.copy(t,e),this._AtlasIndex=t._AtlasIndex,this._NumVertices=t._NumVertices,this._VertexStride=t._VertexStride,this._Vertices=t._Vertices,this._Triangles=t._Triangles,this._VertexBuffer=t._VertexBuffer,this._IndexBuffer=t._IndexBuffer,this._SequenceUVBuffer=t._SequenceUVBuffer,this._SequenceFrames=t._SequenceFrames;}}class Z extends b.a{constructor(){super(),this._IsEnabled=!0,this._Strength=1;}makeInstance(t){const e=new Z;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._IsEnabled=t._IsEnabled,this._Strength=t._Strength;}onDirty(t){this.markDirty();}markDirty(){this.parent.markTransformDirty();}set strength(t){this._Strength!=t&&(this._Strength=t,this.markDirty());}get isEnabled(){return this._IsEnabled}set isEnabled(t){this._IsEnabled!==t&&(this._IsEnabled=t,this.markDirty());}resolveComponentIndices(t){super.resolveComponentIndices(t),this._Parent&&this._Parent.addConstraint(this);}}class $ extends Z{constructor(){super(),this._TargetIdx=0,this._Target=null;}makeInstance(t){const e=new $;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._TargetIdx=t._TargetIdx;}resolveComponentIndices(t){if(super.resolveComponentIndices(t),0!==this._TargetIdx){const e=t[this._TargetIdx];e&&(this._Target=e,this._Actor.addDependency(this._Parent,e));}}}function tt(t,e){let r=t[0],n=t[1],s=t[2],i=t[3],a=Math.atan2(n,r),o=r*r+n*n,c=Math.sqrt(o),l=(r*i-s*n)/c,h=Math.atan2(r*s+n*i,o);e[0]=t[4],e[1]=t[5],e[2]=c,e[3]=l,e[4]=a,e[5]=h;}function et(t,e){let r=e[4];0!==r?k.a.fromRotation(t,r):k.a.identity(t),t[4]=e[0],t[5]=e[1],k.a.scale(t,t,[e[2],e[3]]);let n=e[5];0!==n&&(t[2]=t[0]*n+t[2],t[3]=t[1]*n+t[3]);}const rt=2*Math.PI;class nt extends ${constructor(t){super(t),this._InvertDirection=!1,this._InfluencedBones=[],this._FKChain=null,this._BoneData=null;}makeInstance(t){let e=new nt;return e.copy(this,t),e}copy(t,e){if(super.copy(t,e),this._InvertDirection=t._InvertDirection,this._InfluencedBones=[],t._InfluencedBones)for(let e=0;e<t._InfluencedBones.length;e++){const r=t._InfluencedBones[e];r&&(r.constructor===C.default?this._InfluencedBones.push(r._Idx):this._InfluencedBones.push(r));}}resolveComponentIndices(t){super.resolveComponentIndices(t);const e=this._InfluencedBones;if(e&&e.length)for(let r=0;r<e.length;r++){let n=e[r];n.constructor!==Number&&(n=n._Idx);const s=t[n];e[r]=s,s!==this.parent&&s.addPeerConstraint(this);}}markDirty(){const{_FKChain:t}=this;if(null!==t)for(const e of t)e.bone.markTransformDirty();}completeResolve(){super.completeResolve();const t=this._InfluencedBones;if(!t||!t.length)return;const e=t[0];let r=t[t.length-1];const n=this._FKChain=[],s=this._BoneData=[];for(;r&&r!==e._Parent;)n.unshift({bone:r,ikAngle:0,transformComponents:new Float32Array(6),in:!1}),r=r._Parent;const i=n.length<3;for(let t=0;t<n.length;t++){let e=n[t];e.idx=t,e.in=i;}for(const e of t){const t=n.find(t=>t.bone===e);t?s.push(t):console.warn("Bone not in chain?",t,e);}if(!i)for(let t=0;t<s.length-1;t++){const e=s[t];e.in=!0,n[e.idx+1].in=!0;}const a=this._Actor;for(const e of t)e!==this.parent&&a.addDependency(this,e);if(this._Target&&a.addDependency(this,this._Target),n.length){const t=n[n.length-1];for(const e of n){if(e===t)continue;const r=e.bone._Children;for(const e of r){if(!(e instanceof C.default))continue;n.find(t=>t.bone===e)||a.addDependency(e,t.bone);}}}}constrain(t){const e=this._Target;if(e){const t=e.worldTransform;this.solve(k.b.set(k.b.create(),t[4],t[5]),this._Strength);}}solve1(t,e){const r=t.parentWorldInverse,n=t.bone.worldTranslation,s=k.b.copy(k.b.create(),e),i=k.b.subtract(k.b.create(),s,n),a=k.b.transformMat2(k.b.create(),i,r),o=Math.atan2(a[1],a[0]);return st(t,o),t.ikAngle=o,!0}solve2(t,e,r){const n=this._InvertDirection,s=t.bone,i=e.bone,a=this._FKChain,o=a[t.idx+1],c=t.parentWorldInverse;let l=s.worldTranslation,h=o.bone.worldTranslation,d=i.tipWorldTranslation,u=k.b.copy(k.b.create(),r);l=k.b.transformMat2d(l,l,c),h=k.b.transformMat2d(h,h,c),d=k.b.transformMat2d(d,d,c),u=k.b.transformMat2d(u,u,c);const _=k.b.subtract(k.b.create(),d,h),f=k.b.length(_),p=k.b.subtract(k.b.create(),h,l),m=k.b.length(p),g=k.b.subtract(k.b.create(),u,l),y=k.b.length(g),b=Math.acos(Math.max(-1,Math.min(1,(-f*f+m*m+y*y)/(2*m*y)))),S=Math.acos(Math.max(-1,Math.min(1,(f*f+m*m-y*y)/(2*f*m))));let C,I;if(i.parent!=s){const e=a[t.idx+2].parentWorldInverse;h=o.bone.worldTranslation,d=i.tipWorldTranslation;const r=k.b.subtract(k.b.create(),d,h),s=k.b.transformMat2(k.b.create(),r,e),c=-Math.atan2(s[1],s[0]);n?(C=Math.atan2(g[1],g[0])-b,I=-S+Math.PI+c):(C=b+Math.atan2(g[1],g[0]),I=S-Math.PI+c);}else n?(C=Math.atan2(g[1],g[0])-b,I=-S+Math.PI):(C=b+Math.atan2(g[1],g[0]),I=S-Math.PI);if(st(t,C),st(o,I),o!==e){const t=e.bone;k.a.mul(t.worldTransform,t.parent.worldTransform,t.transform);}return t.ikAngle=C,o.ikAngle=I,!0}solve(t,e){const r=this._BoneData;if(!r.length)return;const n=this._FKChain;for(let t=0;t<n.length;t++){const e=n[t],r=e.bone.parent.worldTransform,s=k.a.invert(k.a.create(),r);tt(k.a.mul(e.bone.transform,s,e.bone.worldTransform),e.transformComponents),e.parentWorldInverse=s;}if(1===r.length)this.solve1(r[0],t);else if(2==r.length)this.solve2(r[0],r[1],t);else {const e=r[r.length-1];for(let s=0;s<r.length-1;s++){const i=r[s];this.solve2(i,e,t);for(let t=i.idx+1;t<n.length-1;t++){const e=n[t],r=e.bone.parent.worldTransform;e.parentWorldInverse=k.a.invert(k.a.create(),r);}}}const s=e;if(1!=s)for(const t of n){if(!t.in){const e=t.bone;k.a.mul(e.worldTransform,e.parent.worldTransform,e.transform);continue}const e=t.transformComponents[4]%rt;let r=t.ikAngle%rt-e;r>Math.PI?r-=rt:r<-Math.PI&&(r+=rt),st(t,e+r*s);}}}function st(t,e){const r=t.bone.parent.worldTransform,n=t.bone.transform,s=t.transformComponents;0===e?k.a.identity(n):k.a.fromRotation(n,e),n[4]=s[0],n[5]=s[1];const i=s[2],a=s[3];n[0]*=i,n[1]*=i,n[2]*=a,n[3]*=a;const o=s[5];0!==o&&(n[2]=n[0]*o+n[2],n[3]=n[1]*o+n[3]),k.a.mul(t.bone.worldTransform,r,n);}class it extends C.default{constructor(){super(),this._Order=0,this._Strength=0,this._InvertDirection=!1,this._InfluencedBones=null;}resolveComponentIndices(t){super.resolveComponentIndices(t);const e=new nt;this._Constraint=e;const r=this._InfluencedBones;e._Actor=this._Actor,e._TargetIdx=this._Idx,e._ParentIdx=r?r[r.length-1]:-1,e._InvertDirection=this._InvertDirection,e._InfluencedBones=r,e._Strength=this._Strength,e._IsEnabled=!0,e.resolveComponentIndices(t);}completeResolve(){super.completeResolve(),this._Constraint.completeResolve();}get strength(){return this._Constraint?this._Constraint.strength:0}set strength(t){this._Constraint&&(this._Constraint.strength=t);}makeInstance(t){const e=new it;return e.copy(this,t),e}copy(t,e){if(super.copy(t,e),this._Order=t._Order,this._Strength=t._Strength,this._InvertDirection=t._InvertDirection,this._InfluencedBones=[],t._InfluencedBones)for(let e=0;e<t._InfluencedBones.length;e++){const r=t._InfluencedBones[e];r&&(r.constructor===c.default?this._InfluencedBones.push(r._Idx):this._InfluencedBones.push(r));}}}var at=r(17),ot=r(18),ct=r(19),lt=r(20),ht=r(21);class dt extends C.default{constructor(){super(),this._DrawOrder=0,this._Asset=null,this._Instance=null,this._Actor=null;}makeInstance(t){const e=new dt;return e.copy(this,t),this._Asset.actor&&(e._Actor=this._Asset.actor.makeInstance()),e}copy(t,e){super.copy(t,e),this._Asset=t._Asset,this._DrawOrder=t._DrawOrder;}initialize(t,e){this._Actor&&this._Actor.initialize(e);}updateWorldTransform(){super.updateWorldTransform(),this._Actor&&this._Actor.root.overrideWorldTransform(this._WorldTransform);}computeAABB(){return this._Actor?this._Actor.computeAABB():null}draw(t){this._Actor&&this._Actor.draw(t);}advance(t){super.advance(t),this._Actor&&this._Actor.advance(t);}}class ut extends b.a{constructor(){super(),this._PropertyType=ut.Integer,this._Value=0;}get propertyType(){return this._PropertyType}get value(){return this._Value}makeInstance(t){const e=new ut;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._PropertyType=t._PropertyType,this._Value=t._Value;}resolveComponentIndices(t){super.resolveComponentIndices(t),void 0!==this._ParentIdx&&(this._Parent=t[this._ParentIdx],this._Parent&&this._Parent._CustomProperties.push(this));}}ut.Type={Integer:0,Float:1,String:2,Boolean:3};class _t{constructor(t){this._ComponentIndex=t,this._Properties=[];}}class ft{constructor(t,e){this._Id=e,this._Name=t,this._Actor=null;}get id(){return this._Id}get name(){return this._Name}get actor(){return this._Actor}}const pt={Closer:0,Further:1,Exact:2};class mt extends ${constructor(t){super(t),this._Distance=100,this._Mode=pt.Closer;}makeInstance(t){let e=new mt;return e.copy(this,t),e}get distance(){return this._Distance}set distance(t){this._Distance!==t&&(this._Distance=t,this.markDirty());}get mode(){return this._Mode}set mode(t){this._Mode!==t&&(this._Mode=t,this.markDirty());}copy(t,e){super.copy(t,e),this._Distance=t._Distance,this._Mode=t._Mode;}constrain(t){let e=this._Target;if(!e)return;let r=this._Parent,n=e.worldTranslation,s=r.worldTranslation,{_Strength:i,_Mode:a,_Distance:o}=this,c=k.b.subtract(k.b.create(),s,n),l=k.b.length(c);switch(a){case pt.Closer:if(l<o)return;break;case pt.Further:if(l>o)return}if(l<.001)return !0;k.b.scale(c,c,1/l),k.b.scale(c,c,o);let h=r.worldTransform,d=k.b.lerp(k.b.create(),s,k.b.add(k.b.create(),n,c),i);h[4]=d[0],h[5]=d[1];}}var gt={Local:0,World:1};const yt=2*Math.PI;class bt extends ${constructor(t){super(t),this._SourceSpace=gt.World,this._DestSpace=gt.World,this._ComponentsA=new Float32Array(6),this._ComponentsB=new Float32Array(6);}makeInstance(t){let e=new bt;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._SourceSpace=t._SourceSpace,this._DestSpace=t._DestSpace;}constrain(t){let e=this._Target;if(!e)return;let r=this._Parent,{_ComponentsA:n,_ComponentsB:s,_Strength:i,_SourceSpace:a,_DestSpace:o}=this,c=r.worldTransform,l=k.a.clone(e.worldTransform);if(a===gt.Local){let t=e.parent;if(t){let e=k.a.invert(k.a.create(),t.worldTransform);l=k.a.mul(e,e,l);}}if(o===gt.Local){let t=r.parent;t&&k.a.mul(l,t.worldTransform,l);}tt(c,n),tt(l,s);let h=n[4]%yt,d=s[4]%yt-h;d>Math.PI?d-=yt:d<-Math.PI&&(d+=yt);let u=1-i;s[4]=h+d*i,s[0]=n[0]*u+s[0]*i,s[1]=n[1]*u+s[1]*i,s[2]=n[2]*u+s[2]*i,s[3]=n[3]*u+s[3]*i,s[5]=n[5]*u+s[5]*i,et(r.worldTransform,s);}}class St extends ${constructor(t){super(t),this._CopyX=!1,this._CopyY=!1,this._ScaleX=1,this._ScaleY=1,this._EnableMinX=!1,this._MinX=0,this._EnableMaxX=!1,this._MaxX=0,this._EnableMinY=!1,this._MinY=0,this._EnableMaxY=!1,this._MaxY=0,this._Offset=!1,this._SourceSpace=gt.World,this._DestSpace=gt.World,this._MinMaxSpace=gt.World;}copy(t,e){super.copy(t,e),this._CopyX=t._CopyX,this._CopyY=t._CopyY,this._ScaleX=t._ScaleX,this._ScaleY=t._ScaleY,this._EnableMinX=t._EnableMinX,this._MinX=t._MinX,this._EnableMaxX=t._EnableMaxX,this._MaxX=t._MaxX,this._EnableMinY=t._EnableMinY,this._MinY=t._MinY,this._EnableMaxY=t._EnableMaxY,this._MaxY=t._MaxY,this._Offset=t._Offset,this._SourceSpace=t._SourceSpace,this._DestSpace=t._DestSpace,this._MinMaxSpace=t._MinMaxSpace;}onDirty(t){this.markDirty();}}class Ct extends St{constructor(t){super(t);}makeInstance(t){let e=new Ct;return e.copy(this,t),e}constrain(t){let e=this._Target,r=this._Parent,n=r._Parent,{_Strength:s,_SourceSpace:i,_DestSpace:a,_MinMaxSpace:o}=this,c=r.worldTransform,l=k.b.set(k.b.create(),c[4],c[5]),h=k.b.create();if(e){let t=k.a.clone(e.worldTransform);if(i===gt.Local){let r=e.parent;if(r){let e=k.a.invert(k.a.create(),r.worldTransform);t=k.a.mul(e,e,t);}}k.b.set(h,t[4],t[5]),this._CopyX?(h[0]*=this._ScaleX,this._Offset&&(h[0]+=r._Translation[0])):h[0]=a===gt.Local?0:l[0],this._CopyY?(h[1]*=this._ScaleY,this._Offset&&(h[1]+=r._Translation[1])):h[1]=a===gt.Local?0:l[1],a===gt.Local&&n&&k.b.transformMat2d(h,h,n.worldTransform);}else k.b.copy(h,l);let d=!(o!==gt.Local||!n);if(d){let t=k.a.invert(k.a.create(),n.worldTransform);k.b.transformMat2d(h,h,t);}this._EnableMaxX&&h[0]>this._MaxX&&(h[0]=this._MaxX),this._EnableMinX&&h[0]<this._MinX&&(h[0]=this._MinX),this._EnableMaxY&&h[1]>this._MaxY&&(h[1]=this._MaxY),this._EnableMinY&&h[1]<this._MinY&&(h[1]=this._MinY),d&&k.b.transformMat2d(h,h,n.worldTransform);let u=1-s;c[4]=l[0]*u+h[0]*s,c[5]=l[1]*u+h[1]*s;}}class It extends St{constructor(t){super(t),this._ComponentsA=new Float32Array(6),this._ComponentsB=new Float32Array(6);}makeInstance(t){let e=new It;return e.copy(this,t),e}constrain(t){let e=this._Target,r=this._Parent,n=r._Parent,{_ComponentsA:s,_ComponentsB:i,_Strength:a,_SourceSpace:o,_DestSpace:c,_MinMaxSpace:l}=this,h=r.worldTransform,d=k.a.create();if(tt(h,s),e){if(k.a.copy(d,e.worldTransform),o===gt.Local){let t=e.parent;if(t){let e=k.a.invert(k.a.create(),t.worldTransform);d=k.a.mul(e,e,d);}}tt(d,i),this._CopyX?(i[2]*=this._ScaleX,this._Offset&&(i[2]*=r._Scale[0])):i[2]=c===gt.Local?1:s[2],this._CopyY?(i[3]*=this._ScaleY,this._Offset&&(i[3]*=r._Scale[1])):i[3]=c===gt.Local?0:s[3],c===gt.Local&&n&&(et(d,i),k.a.mul(d,n.worldTransform,d),tt(d,i));}else k.a.copy(d,h),i[0]=s[0],i[1]=s[1],i[2]=s[2],i[3]=s[3],i[4]=s[4],i[5]=s[5];let u=!(l!==gt.Local||!n);if(u){et(d,i);let t=k.a.invert(k.a.create(),n.worldTransform);k.a.mul(d,t,d),tt(d,i);}this._EnableMaxX&&i[2]>this._MaxX&&(i[2]=this._MaxX),this._EnableMinX&&i[2]<this._MinX&&(i[2]=this._MinX),this._EnableMaxY&&i[3]>this._MaxY&&(i[3]=this._MaxY),this._EnableMinY&&i[3]<this._MinY&&(i[3]=this._MinY),u&&(et(d,i),k.a.mul(d,n.worldTransform,d),tt(d,i));let _=1-a;i[4]=s[4],i[0]=s[0],i[1]=s[1],i[2]=s[2]*_+i[2]*a,i[3]=s[3]*_+i[3]*a,i[5]=s[5],et(r.worldTransform,i);}}const At=2*Math.PI;class Mt extends ${constructor(t){super(t),this._Copy=!1,this._EnableMin=!1,this._EnableMax=!1,this._Offset=!1,this._Min=-At,this._Max=At,this._Scale=1,this._SourceSpace=gt.World,this._DestSpace=gt.World,this._MinMaxSpace=gt.World,this._ComponentsA=new Float32Array(6),this._ComponentsB=new Float32Array(6);}onDirty(t){this.markDirty();}makeInstance(t){let e=new Mt;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._Copy=t._Copy,this._EnableMin=t._EnableMin,this._EnableMax=t._EnableMax,this._Offset=t._Offset,this._Min=t._Min,this._Max=t._Max,this._Scale=t._Scale,this._SourceSpace=t._SourceSpace,this._DestSpace=t._DestSpace,this._MinMaxSpace=t._MinMaxSpace;}constrain(t){let e=this._Target,r=this._Parent,n=r._Parent,{_ComponentsA:s,_ComponentsB:i,_Strength:a,_SourceSpace:o,_DestSpace:c,_MinMaxSpace:l}=this,h=r.worldTransform,d=k.a.create();if(tt(h,s),e){if(k.a.copy(d,e.worldTransform),o===gt.Local){let t=e.parent;if(t){let e=k.a.invert(k.a.create(),t.worldTransform);d=k.a.mul(e,e,d);}}tt(d,i),this._Copy?(i[4]*=this._Scale,this._Offset&&(i[4]+=r._Rotation)):i[4]=c===gt.Local?0:s[4],c===gt.Local&&n&&(et(d,i),k.a.mul(d,n.worldTransform,d),tt(d,i));}else k.a.copy(d,h),i[0]=s[0],i[1]=s[1],i[2]=s[2],i[3]=s[3],i[4]=s[4],i[5]=s[5];let u=!(l!==gt.Local||!n);if(u){et(d,i);let t=k.a.invert(k.a.create(),n.worldTransform);k.a.mul(d,t,d),tt(d,i);}this._EnableMax&&i[4]>this._Max&&(i[4]=this._Max),this._EnableMin&&i[4]<this._Min&&(i[4]=this._Min),u&&(et(d,i),k.a.mul(d,n.worldTransform,d),tt(d,i));let _=s[4]%At,f=i[4]%At-_;f>Math.PI?f-=At:f<-Math.PI&&(f+=At),i[4]=_+f*a,i[0]=s[0],i[1]=s[1],i[2]=s[2],i[3]=s[3],i[5]=s[5],et(r.worldTransform,i);}}const Tt=k.a.create();class wt extends(J(O(C.default))){constructor(){super(),this._IsClosed=!1,this._IsHidden=!1,this._Points=[],this._RenderPath=null,this._IsRenderPathDirty=!0;}get isHidden(){return this._IsHidden}set isHidden(t){this._IsHidden=t;}get isClosed(){return this._IsClosed}set isClosed(t){this._IsClosed=t;}initialize(t,e){this._RenderPath=e.makePath();}get numPoints(){return this._Points.length}makeInstance(t){const e=new wt;return e.copy(this,t),e}copy(t,e){super.copy(t,e),this._IsClosed=t._IsClosed,this._IsHidden=t._IsHidden;const r=t._Points.length;this._Points=new Array(r);for(let e=0;e<r;e++){let r=t._Points[e];this._Points[e]=r.makeInstance();}}get deformedPoints(){let t=null;this._Skin&&(t=this._Skin.boneMatrices);const{_Points:e,worldTransform:r}=this;if(!t)return e;const n=[];for(const s of e)n.push(s.skin(r,t));return n}getPathRenderTransform(){return this.isConnectedToBones?Tt:this.worldTransform}getPathTransform(){return this.isConnectedToBones?Tt:this.worldTransform}invalidateDrawable(){this._IsRenderPathDirty=!0,this._RenderPath.setIsVolatile(!0),this.shape.invalidatePath();}getPath(t){const{_RenderPath:e,_IsRenderPathDirty:r}=this;if(!r)return e;e.rewind();const{deformedPoints:n,isClosed:s}=this,i=D(n,s);return F.default.pointPath(e,i,s)}}class kt extends b.a{constructor(){super(),this._BoneMatrices=null;}get boneMatrices(){return this._BoneMatrices}update(t){const e=this._Parent;if(e&&e._ConnectedBones){const t=e._ConnectedBones,r=6*(t.length+1);let n=this._BoneMatrices;n&&n.length===r||(this._BoneMatrices=n=new Float32Array(r),n[0]=1,n[1]=0,n[2]=0,n[3]=1,n[4]=0,n[5]=0);let s=6;const i=k.a.create();for(const e of t){if(!e.node){n[s++]=1,n[s++]=0,n[s++]=0,n[s++]=1,n[s++]=0,n[s++]=0;continue}const t=k.a.mul(i,e.node._WorldTransform,e.ibind);n[s++]=t[0],n[s++]=t[1],n[s++]=t[2],n[s++]=t[3],n[s++]=t[4],n[s++]=t[5];}}e.invalidateDrawable();}makeInstance(t){const e=new kt;return e.copy(this,t),e}completeResolve(){super.completeResolve();const t=this._Actor;let e=this._Parent;if(e){e.setSkin(this),t.addDependency(this,e);const r=e.connectedBones;if(r&&r.length)for(const{node:e}of r){t.addDependency(this,e);const r=e.allConstraints;if(r)for(const e of r)t.addDependency(this,e);}}}}var Pt=r(22);class vt{constructor(t){this._Actor=t,this._Components=[],this._Nodes=[],this._RootNode=new C.default,this._RootNode._Name="Root",this._Components.push(this._RootNode),this._Drawables=[],this._Animations=[],this._IsImageSortDirty=!1,this._Order=null,this._IsDirty=!1,this._DirtDepth=0,this._Name="Artboard",this._Origin=k.b.create(),this._Translation=k.b.create(),this._Color=k.c.create(),this._ClipContents=!0,this._Width=0,this._Height=0;}get name(){return this._Name}get width(){return this._Width}get height(){return this._Height}get origin(){return this._Origin}get originWorld(){return k.b.fromValues(this._Width*this._Origin[0],this._Height*this._Origin[1])}get translation(){return this._Translation}get color(){return this._Color}get color8(){return this._Color.map(t=>Math.round(255*t))}get clipContents(){return this._ClipContents}get root(){return this._RootNode}get actor(){return this._Actor}addDependency(t,e){let r=e._Dependents;return r||(r=e._Dependents=[]),-1===r.indexOf(t)&&(r.push(t),!0)}sortDependencies(){let t=new Set,e=new Set,r=[];if(!function n(s){if(t.has(s))return !0;if(e.has(s))return console.warn("Dependency cycle!",s),!1;e.add(s);let i=s._Dependents;if(i)for(let t of i)if(!n(t))return !1;return t.add(s),r.unshift(s),!0}(this._RootNode))return !1;for(let t=0;t<r.length;t++){let e=r[t];e._GraphOrder=t,e._DirtMask=255;}this._Order=r,this._IsDirty=!0;}addDirt(t,e,r){if((t._DirtMask&e)===e)return !1;let n=t._DirtMask|e;if(t._DirtMask=n,this._IsDirty=!0,t.onDirty(n),t._GraphOrder<this._DirtDepth&&(this._DirtDepth=t._GraphOrder),!r)return !0;let s=t._Dependents;if(s)for(let t of s)this.addDirt(t,e,r);return !0}update(){if(!this._IsDirty)return !1;let t=this._Order,e=t.length;let r=0;for(;this._IsDirty&&r<100;){this._IsDirty=!1;for(let r=0;r<e;r++){let e=t[r];this._DirtDepth=r;let n=e._DirtMask;if(0!==n&&(e._DirtMask=0,e.update(n),this._DirtDepth<r))break}r++;}return !0}resolveHierarchy(){let t=this._Components;for(let e of t)if(null!=e)switch(e._Actor=this,e.resolveComponentIndices(t),e.isNode&&this._Nodes.push(e),e.constructor){case dt:case Q:case v:case A.default:this._Drawables.push(e);}for(let e of t)null!=e&&e.completeResolve();this.sortDependencies(),this._Drawables.sort(function(t,e){return t._DrawOrder-e._DrawOrder});}dispose(t){const e=this._Components;for(const r of e)r.dispose(this,t);this._ClippingPath&&(F.default.destroyPath(this._ClippingPath),this._ClippingPath=null);}advance(t){this.update();let e=this._Components;for(let r of e)r&&r.advance(t);this._IsImageSortDirty&&(this._Drawables.sort(function(t,e){return t._DrawOrder-e._DrawOrder}),this._IsImageSortDirty=!1);}draw(t){t.save(),this._ClippingPath&&t.clipPath(this._ClippingPath);let e=this._Drawables;for(let r of e)r.draw(t);t.restore();}getNode(t){let e=this._Nodes;for(let r of e)if(r._Name===t)return r;return null}get animations(){return this._Animations}getAnimation(t){let e=this._Animations;for(let r of e)if(r._Name===t)return r;return null}getAnimationInstance(t){let e=this.getAnimation(t);return e?new Pt.default(this,e):null}makeInstance(){const t=new vt(this._Actor);return t.copy(this),t}artboardAABB(){const{_Width:t,_Height:e}=this,r=-this._Origin[0]*t,n=-this._Origin[1]*e;return new Float32Array([r,n,r+t,n+e])}computeAABB(){let t=Number.MAX_VALUE,e=Number.MAX_VALUE,r=-Number.MAX_VALUE,n=-Number.MAX_VALUE;for(const s of this._Drawables){if(s.opacity<.01)continue;const i=s.computeAABB();i&&(i[0]<t&&(t=i[0]),i[1]<e&&(e=i[1]),i[2]>r&&(r=i[2]),i[3]>n&&(n=i[3]));}return new Float32Array([t,e,r,n])}copy(t){this._Name=t._Name,this._Origin=k.b.clone(t._Origin),this._Translation=k.b.clone(t._Translation),this._Color=k.c.clone(t._Color),this._ClipContents=t._ClipContents,this._Width=t._Width,this._Height=t._Height;let e=t._Components;this._Animations=t._Animations,this._Components.length=0,this._Nodes.length=0,this._Drawables.length=0;for(let t of e)t?this._Components.push(t.makeInstance(this)):this._Components.push(null);this._RootNode=this._Components[0],this.resolveHierarchy();}initialize(t){const e=this._Components;for(const r of e)r.initialize(this,t);if(this._ClipContents){this._ClippingPath=t.makePath();const e=-this._Origin[0]*this._Width,r=-this._Origin[1]*this._Height;this._ClippingPath.addRect(e,r,e+this._Width,r+this._Height);}}}var xt=r(6),Ot=r(12),Dt=r(13);class Ft{static get Off(){return 0}static get Sequential(){return 1}static get Synced(){return 2}}const{Off:Rt,Sequential:Bt,Synced:Et}=Ft,{PaintDirty:Vt}=w.a,{trimPath:Lt,trimPathSync:Ut}=F.default;class Nt extends b.a{constructor(){super(),this._RenderOpacity=1,this._Opacity=1;}markDirty(){this._Actor.addDirt(this,Vt,!0);}copy(t,e){super.copy(t,e),this._Opacity=t._Opacity;}get opacity(){return this._Opacity}update(t){super.update(t),this._RenderOpacity=this._Opacity*this._Parent._RenderOpacity,this._Paint&&F.default.setPaintBlendMode(this._Paint,this._Parent._BlendMode);}initialize(t,e){this._Paint=e.makePaint(),this._Parent&&F.default.setPaintBlendMode(this._Paint,this._Parent._BlendMode);}dispose(t,e){e.destroyPaint(this._Paint);}}class Wt extends Nt{constructor(){super(),this._Color=new Float32Array(4);}copy(t,e){super.copy(t,e),k.c.copy(this._Color,t._Color);}get runtimeColor(){const{_Color:t}=this;return [t[0],t[1],t[2],t[3]*this._RenderOpacity]}get cssColor(){const t=this._Color;return "rgba("+Math.round(255*t[0])+", "+Math.round(255*t[1])+", "+Math.round(255*t[2])+", "+t[3]*this._Opacity+")"}}class Xt extends Wt{constructor(){super(),this._FillRule=xt.a.EvenOdd;}get fillRule(){return this._FillRule}makeInstance(t){const e=new Xt;return Xt.prototype.copy.call(e,this,t),e}copy(t,e){super.copy(t,e),this._FillRule=t._FillRule;}initialize(t,e){super.initialize(t,e),e.setPaintFill(this._Paint);}fill(t,e){const{_Paint:r,runtimeColor:n}=this;t.setPaintColor(r,n),t.setPathFillType(e,this._FillRule),t.drawPath(e,r);}resolveComponentIndices(t){super.resolveComponentIndices(t),this._Parent&&this._Parent.addFill(this);}}const Gt=t=>(class extends t{constructor(t){super(t),this._Width=0,this._Cap=Ot.a.Butt,this._Join=Dt.a.Miter,this._Trim=Rt,this._TrimStart=0,this._TrimEnd=1,this._TrimOffset=0,this._EffectPath=null;}initialize(t,e){super.initialize(t,e);const{_Paint:r,_Cap:n,_Join:s}=this;F.default.setPaintStroke(r),F.default.setPaintStrokeCap(r,n),F.default.setPaintStrokeJoin(r,s);}prepStroke(t,e){const{_Paint:r,_Trim:n,width:s}=this;if(r.setStrokeWidth(s),n!==Rt){const t=n===Bt?Lt:Ut,{trimStart:r,trimEnd:s,trimOffset:i,_EffectPath:a}=this;if(a)return a;let o=null;if(1!==Math.abs(r-s)){let n=(r+i)%1,a=(s+i)%1;if(n<0&&(n+=1),a<0&&(a+=1),r>s){const t=a;a=n,n=t;}o=a>=n?t(e,n,a,!1):t(e,a,n,!0);}return o||(o=e.copy()),this._EffectPath=o,o}return e}markPathEffectsDirty(){const{_EffectPath:t}=this;t&&(F.default.destroyPath(t),this._EffectPath=null);}get width(){return this._Width}set width(t){this._Width!==t&&(this._Width=t);}get trimStart(){return this._TrimStart}set trimStart(t){this._TrimStart!==t&&(this._TrimStart=t,this.markPathEffectsDirty());}get trimEnd(){return this._TrimEnd}set trimEnd(t){this._TrimEnd!==t&&(this._TrimEnd=t,this.markPathEffectsDirty());}get trimOffset(){return this._TrimOffset}set trimOffset(t){this._TrimOffset!==t&&(this._TrimOffset=t,this.markPathEffectsDirty());}get cap(){return this._Cap}get join(){return this._Join}copy(t,e){super.copy(t,e),this._Width=t._Width,this._Join=t._Join,this._Cap=t._Cap,this._Trim=t._Trim,this._TrimStart=t._TrimStart,this._TrimEnd=t._TrimEnd,this._TrimOffset=t._TrimOffset;}resolveComponentIndices(t){super.resolveComponentIndices(t),this._Parent&&this._Parent.addStroke(this);}});class Ht extends(Gt(Wt)){constructor(){super();}makeInstance(t){const e=new Ht;return e.copy(this,t),e}stroke(t,e){const{_Paint:r,runtimeColor:n}=this;e=this.prepStroke(t,e),t.setPaintColor(r,n),t.drawPath(e,r);}}class qt extends Nt{constructor(){super(),this._ColorStops=new Float32Array(10),this._Start=k.b.create(),this._End=k.b.create(),this._RenderStart=k.b.create(),this._RenderEnd=k.b.create(),this._GradientDirty=!0;}copy(t,e){super.copy(t,e),this._ColorStops=new Float32Array(t._ColorStops),k.b.copy(this._Start,t._Start),k.b.copy(this._End,t._End),k.b.copy(this._RenderStart,t._RenderStart),k.b.copy(this._RenderEnd,t._RenderEnd);}completeResolve(){super.completeResolve();const t=this._Actor,e=this._Parent;t.addDependency(this,e);}update(t){super.update(t);const e=this._Parent,{transformAffectsStroke:r}=e;if(r)k.b.copy(this._RenderStart,this._Start),k.b.copy(this._RenderEnd,this._End);else {const t=e.worldTransform;k.b.transformMat2d(this._RenderStart,this._Start,t),k.b.transformMat2d(this._RenderEnd,this._End,t);}this._GradientDirty=!0;}}class Yt extends qt{constructor(){super(),this._FillRule=xt.a.EvenOdd;}get fillRule(){return this._FillRule}makeInstance(t){const e=new Yt;return Yt.prototype.copy.call(e,this,t),e}copy(t,e){super.copy(t,e),this._FillRule=t._FillRule;}dispose(t,e){super.dispose(t,e),this._Gradient&&e.destroyLinearGradient(this._Gradient);}fill(t,e){const{_RenderStart:r,_RenderEnd:n,_ColorStops:s,_Paint:i}=this;if(this._GradientDirty){this._Gradient&&t.destroyLinearGradient(this._Gradient),this._GradientDirty=!1;const e=this._RenderOpacity,a=s.length/5;let o=0;const c=[],l=[];for(let t=0;t<a;t++)c.push([s[o++],s[o++],s[o++],s[o++]*e]),l.push(s[o++]);const h=t.makeLinearGradient(r,n,c,l);i.setShader(h),this._Gradient=h;}t.setPathFillType(e,this._FillRule),t.drawPath(e,i);}resolveComponentIndices(t){super.resolveComponentIndices(t),this._Parent&&this._Parent.addFill(this);}}class jt extends(Gt(qt)){constructor(){super();}makeInstance(t){const e=new jt;return e.copy(this,t),e}stroke(t,e){const{_RenderStart:r,_RenderEnd:n,_ColorStops:s,_Paint:i}=this;if(e=this.prepStroke(t,e),this._GradientDirty){this._Gradient&&t.destroyLinearGradient(this._Gradient),this._GradientDirty=!1;const e=this._RenderOpacity,a=s.length/5;let o=0;const c=[],l=[];for(let t=0;t<a;t++)c.push([s[o++],s[o++],s[o++],s[o++]*e]),l.push(s[o++]);const h=t.makeLinearGradient(r,n,c,l);i.setShader(h),this._Gradient=h;}t.drawPath(e,i);}}class zt extends qt{constructor(){super(),this._SecondaryRadiusScale=1;}copy(t,e){super.copy(t,e),this._SecondaryRadiusScale=t._SecondaryRadiusScale;}}class Kt extends zt{constructor(){super(),this._FillRule=xt.a.EvenOdd;}get fillRule(){return this._FillRule}makeInstance(t){const e=new Kt;return Kt.prototype.copy.call(e,this,t),e}copy(t,e){super.copy(t,e),this._FillRule=t._FillRule;}fill(t,e){const{_Paint:r,_RenderStart:n,_RenderEnd:s,_ColorStops:i,_SecondaryRadiusScale:a}=this;if(this._GradientDirty){this._Gradient&&t.destroyRadialGradient(this._Gradient),this._GradientDirty=!1;const e=this._RenderOpacity,a=i.length/5;let o=0;const c=[],l=[];for(let t=0;t<a;t++)c.push([i[o++],i[o++],i[o++],i[o++]*e]),l.push(i[o++]);const h=t.makeRadialGradient(n,k.b.distance(n,s),c,l);r.setShader(h),this._Gradient=h;}t.setPathFillType(e,this._FillRule),t.drawPath(e,r);}resolveComponentIndices(t){super.resolveComponentIndices(t),this._Parent&&this._Parent.addFill(this);}}class Jt extends(Gt(zt)){constructor(){super();}makeInstance(t){const e=new Jt;return e.copy(this,t),e}stroke(t,e){const{_Paint:r,_RenderStart:n,_RenderEnd:s,_ColorStops:i,_SecondaryRadiusScale:a}=this;if(e=this.prepStroke(t,e),this._GradientDirty){this._Gradient&&t.destroyRadialGradient(this._Gradient),this._GradientDirty=!1;const e=this._RenderOpacity,a=i.length/5;let o=0;const c=[],l=[];for(let t=0;t<a;t++)c.push([i[o++],i[o++],i[o++],i[o++]*e]),l.push(i[o++]);const h=t.makeRadialGradient(n,k.b.distance(n,s),c,l);r.setShader(h),this._Gradient=h;}t.drawPath(e,r);}}let Qt=new Float32Array(32);class Zt{constructor(){this._Value=0,this._Time=0,this._Type=0,this._Interpolator=null;}setNext(t){const{_Value:e}=this;e.constructor===Float32Array?this.interpolate=Zt.prototype.interpolateVertexBuffer:e.constructor===Array&&e.length>0&&e[0].constructor===Object?this.interpolate=Zt.prototype.interpolateDrawOrder:this.interpolate=Zt.prototype.interpolateFloat;}interpolateDrawOrder(t,e){return this._Value}interpolateVertexBuffer(t,e){return Qt=function(t,e,r,n){t.length<r.length&&(t=new Float32Array(r.length));const s=1-n,i=r.length;for(let a=0;a<i;a++)t[a]=e[a]*s+r[a]*n;return t}(Qt,this._Value,e._Value,t)}interpolateFloat(t,e){return this._Value*(1-t)+e._Value*t}}Zt.Type={Hold:0,Linear:1,Mirrored:2,Asymmetric:3,Disconnected:4,Progression:5};var $t=r(23),te=r.n($t);class ee{getEasedMix(t){return 0}}ee.instance=new ee;class re{getEasedMix(t){return t}}re.instance=new re;class ne{constructor(t,e,r,n){this._Bezier=te()(t,e,r,n);}getEasedMix(t){return this._Bezier(t)}}function se(t,e){return {id:t,key:e}}const ie={Nodes:se(1,"nodes"),ActorNode:se(2,"node"),ActorBone:se(3,"bone"),ActorRootBone:se(4,"rootBone"),ActorImage:se(5,"image"),View:se(6,"view"),Animation:se(7,"animation"),Animations:se(8,"animations"),Atlases:se(9,"atlases"),Atlas:se(10,"atlas"),ActorEvent:se(12,"event"),CustomIntProperty:se(13,"customInt"),CustomFloatProperty:se(14,"customFloat"),CustomStringProperty:se(15,"customString"),CustomBooleanProperty:se(16,"customBool"),ActorImageSequence:se(22,"imageSequence"),ActorNodeSolo:se(23,"solo"),JellyComponent:se(28,"jelly"),ActorJellyBone:se(29,"jellyBone"),ActorIKConstraint:se(30,"ikConstraint"),ActorDistanceConstraint:se(31,"distanceConstraint"),ActorTranslationConstraint:se(32,"translationConstraint"),ActorRotationConstraint:se(33,"rotationConstraint"),ActorScaleConstraint:se(34,"scaleConstraint"),ActorTransformConstraint:se(35,"transformConstraint"),ActorShape:se(100,"shape"),ActorPath:se(101,"path"),ColorFill:se(102,"colorFill"),ColorStroke:se(103,"colorStroke"),GradientFill:se(104,"gradientFill"),GradientStroke:se(105,"gradientStroke"),RadialGradientFill:se(106,"radialGradientFill"),RadialGradientStroke:se(107,"radialGradientStroke"),ActorEllipse:se(108,"ellipse"),ActorRectangle:se(109,"rectangle"),ActorTriangle:se(110,"triangle"),ActorStar:se(111,"star"),ActorPolygon:se(112,"polygon"),ActorSkin:se(113,"skin"),ActorArtboard:se(114,"artboard"),Artboards:se(115,"artboards"),ActorCacheNode:se(116,"cacheNode"),ActorTargetNode:se(117,"targetNode"),ActorLayerNode:se(118,"layerNode"),FlareNode:se(24,"flareNode"),EmbeddedAssets:se(25,"embeddedAssets"),FlareAsset:se(26,"flareAsset")},ae={},oe=new Map;for(const t in ie){const e=ie[t];ae[t]=e.id,oe.set(e.key,e.id);}class ce{static get Types(){return ae}static fromString(t){return oe.get(t)||0}}var le=r(8);r.d(e,"default",function(){return pr});const he=ce.Types,{Off:de}=Ft,ue=o.Types,_e={bin:{stream:p,container:Uint8Array,extension:".nma"},json:{stream:m,container:Object,extension:"nmj"}};function fe(t,e,r){if(t.isEOF())return null;let n=0,s=0;const i=t.containerType,a=_e[i];try{if(void 0===(n=t.readBlockType(r)))return null;const i=t.readUint32Length();s=new a.container(i),t.readRaw(s,i);}catch(t){return console.log(t.constructor),e&&e(t),null}return {type:n,reader:new a.stream(s)}}function pe(t,e){e.readUint16Length();let r=t._Components;const n=t.actor.dataVersion;let s=null;for(;null!==(s=fe(e,function(e){t.actor.error=e;},ce));){let e=null;switch(s.type){case he.CustomIntProperty:case he.CustomStringProperty:case he.CustomFloatProperty:case he.CustomBooleanProperty:e=we(s.reader,new ut,s.type);break;case he.ColliderRectangle:e=Pe(n,s.reader,new at.default);break;case he.ColliderTriangle:e=ve(n,s.reader,new ot.default);break;case he.ColliderCircle:e=xe(n,s.reader,new ct.default);break;case he.ColliderPolygon:e=Oe(n,s.reader,new lt.default);break;case he.ColliderLine:e=De(n,s.reader,new ht.default);break;case he.ActorEvent:e=Fe(s.reader,new S);break;case he.ActorNode:case he.ActorCacheNode:e=Re(n,s.reader,new C.default);break;case he.ActorTargetNode:e=Re(n,s.reader,new I.default);break;case he.ActorLayerNode:e=lr(n,s.reader,new A.default);break;case he.ActorBone:e=Ee(n,s.reader,new c.default);break;case he.ActorJellyBone:e=Ve(s.reader,new X);break;case he.JellyComponent:e=Le(s.reader,new z);break;case he.ActorRootBone:e=Ue(n,s.reader,new K);break;case he.ActorImage:e=ur(n,s.reader,new Q);break;case he.ActorImageSequence:e=_r(n,s.reader,new Q);break;case he.ActorIKTarget:e=Ne(n,s.reader,new it);break;case he.NestedActorNode:e=fr(n,s.reader,new dt,t._NestedActorAssets);break;case he.ActorNodeSolo:e=Be(n,s.reader,new M);break;case he.ActorIKConstraint:e=Xe(s.reader,new nt);break;case he.ActorDistanceConstraint:e=Ge(s.reader,new mt);break;case he.ActorTransformConstraint:e=He(s.reader,new bt);break;case he.ActorTranslationConstraint:e=Ye(s.reader,new Ct);break;case he.ActorScaleConstraint:e=Ye(s.reader,new It);break;case he.ActorRotationConstraint:e=qe(s.reader,new Mt);break;case he.ActorShape:e=je(n,s.reader,new v);break;case he.ActorPath:e=dr(n,s.reader,new wt);break;case he.ColorFill:e=tr(s.reader,new Xt);break;case he.ColorStroke:e=rr(s.reader,new Ht);break;case he.GradientFill:e=ir(s.reader,new Yt);break;case he.GradientStroke:e=ar(s.reader,new jt);break;case he.RadialGradientFill:e=or(s.reader,new Kt);break;case he.RadialGradientStroke:e=cr(s.reader,new Jt);break;case he.ActorEllipse:e=$e(n,s.reader,new E);break;case he.ActorRectangle:e=Je(n,s.reader,new L);break;case he.ActorTriangle:e=Ze(n,s.reader,new N);break;case he.ActorStar:e=Ke(n,s.reader,new U);break;case he.ActorPolygon:e=Qe(n,s.reader,new V);break;case he.ActorSkin:e=Me(s.reader,new kt);}e&&(e._Idx=r.length),r.push(e);}t.resolveHierarchy();}function me(t,e){const r=new u(t);t._Animations.push(r),r._Name=e.readString("name"),r._FPS=e.readUint8("fps"),r._Duration=e.readFloat32("duration"),r._Loop=e.readBool("isLooping"),e.openArray("keyed");const n=e.readUint16Length();if(n>0){for(let s=0;s<n;s++){e.openObject("component");const n=e.readId("component");let s=t._Components[n];if(s){const i=new _t(n);s.constructor===S?r._TriggerComponents.push(i):r._Components.push(i);const a=e.readUint16Length();for(let r=0;r<a;r++){let r=fe(e,function(e){t.actor.error=e;},o);const n=r.reader,a=r.type;let c=!1;switch(a){case ue.PosX:case ue.PosY:case ue.ScaleX:case ue.ScaleY:case ue.Rotation:case ue.Opacity:case ue.DrawOrder:case ue.Length:case ue.ImageVertices:case ue.ConstraintStrength:case ue.Trigger:case ue.IntProperty:case ue.FloatProperty:case ue.StringProperty:case ue.BooleanProperty:case ue.IsCollisionEnabled:case ue.ActiveChildIndex:case ue.Sequence:case ue.PathVertices:case ue.FillColor:case ue.StrokeColor:case ue.StrokeWidth:case ue.StrokeStart:case ue.StrokeEnd:case ue.StrokeOffset:case ue.FillGradient:case ue.StrokeGradient:case ue.FillRadial:case ue.StrokeRadial:case ue.StrokeOpacity:case ue.FillOpacity:case ue.ShapeWidth:case ue.ShapeHeight:case ue.CornerRadius:case ue.InnerRadius:c=!0;}if(!c)continue;const h=new o(a);i._Properties.push(h),n.openArray("frames");const d=n.readUint16Length();let u=null;for(let e=0;e<d;e++){let e=new Zt(h);switch(n.openObject("frame"),e._Time=n.readFloat64("time"),a){case ue.IsCollisionEnabled:case ue.BooleanProperty:case ue.StringProperty:case ue.Trigger:case ue.DrawOrder:case ue.ActiveChildIndex:e._Interpolator=ee.instance;break;default:switch(n.readUint8("interpolatorType")){case 0:e._Interpolator=ee.instance;break;case 1:e._Interpolator=re.instance;break;case 2:e._Interpolator=new ne(n.readFloat32("cubicX1"),n.readFloat32("cubicY1"),n.readFloat32("cubicX2"),n.readFloat32("cubicY2"));}break}if(a===ue.PathVertices){const r=t._Components[i._ComponentIndex];if(!(r instanceof wt))continue;const s=r._Points.length,a=[];n.openArray("value");for(let t=0;t<s;t++){const e=r._Points[t],s=n.readFloat32("translationX"),i=n.readFloat32("translationX");if(a.push(s,i),e.constructor===l.c)a.push(n.readFloat32("radius"));else {const t=n.readFloat32("inValueX"),e=n.readFloat32("inValueY");a.push(t,e);const r=n.readFloat32("outValueX"),s=n.readFloat32("outValueY");a.push(r,s);}}n.closeArray(),e._Value=new Float32Array(a);}else if(a===ue.FillColor||a===ue.StrokeColor)e._Value=n.readFloat32Array(new Float32Array(4),"value");else if(a===ue.FillGradient||a===ue.StrokeGradient||a===ue.StrokeRadial||a===ue.FillRadial){const t=n.readUint16("length");e._Value=n.readFloat32Array(new Float32Array(t),"value");}else if(a===ue.Trigger);else if(a===ue.IntProperty)e._Value=n.readInt32("value");else if(a===ue.StringProperty)e._Value=n.readString("value");else if(a===ue.BooleanProperty||a===ue.IsCollisionEnabled)e._Value=n.readBool("value");else if(a===ue.DrawOrder){n.openArray("drawOrder");const t=n.readUint16Length(),r=[];for(let e=0;e<t;e++){n.openObject("order");const t=n.readId("component"),e=n.readUint16("order");n.closeObject(),r.push({componentIdx:t,value:e});}n.closeArray(),e._Value=r;}else a===ue.ImageVertices?(e._Value=new Float32Array(2*s._NumVertices),n.readFloat32Array(e._Value,"array")):e._Value=n.readFloat32("value");a===ue.DrawOrder&&(e._Interpolator=ee.instance),u&&u.setNext(e),h._KeyFrames.push(e),u=e,n.closeObject();}u&&u.setNext(null);}}else {const r=e.readUint16();for(let n=0;n<r;n++){fe(e,function(e){t.actor.error=e;});}}e.closeObject();}e.closeArray();}else e.closeArray();}function ge(t,e){e.readUint16Length();let r=null;for(;null!==(r=fe(e,function(e){t.actor.error=e;},ce));)switch(r.type){case he.Animation:me(t,r.reader);}}function ye(t,e){let r=new ft(e.readString(),e.readString());t._NestedActorAssets.push(r);}function be(t,e){e.readUint16();let r=null;for(;null!==(r=fe(e,function(e){t.error=e;}));)switch(r.type){case he.NestedActorAsset:ye(t,r.reader);}}function Se(t,e,r){const n=e.readBool("isOOB");e.openArray("data");const s=e.readUint16Length();let i=1+s,a=0;function o(){++a==i&&(e.closeArray(),r());}for(let r=0;r<s;r++)e.readImage(n,e=>{t._Atlases.push(new _(e)),o();});o();}function Ce(t,e){e.readUint16Length();const r=t._Artboards;let n=null;for(;null!==(n=fe(e,function(e){t.error=e;},ce));)switch(n.type){case he.ActorArtboard:{const e=Ae(n.reader,new vt(t),n.type);e&&r.push(e);break}}}function Ie(t,e,r){let n=new p(new Uint8Array(e));if(70!==n.readUint8()||76!==n.readUint8()||65!==n.readUint8()||82!==n.readUint8()||69!==n.readUint8()){const t=new DataView(e),r=new TextDecoder("utf-8").decode(t);n=new m({container:JSON.parse(r)});}const s=n.readUint32("version"),i=new y;i.dataVersion=s;let a=null,o=1,c=0;function l(){++c==o&&function(t,e,r){let n=e._NestedActorAssets.length,s=t.loadNestedActor;if(0!=n&&s)for(let t of e._NestedActorAssets)s(t,function(s){t._Actor=s,--n<=0&&r(e);});else r(e);}(t,i,r);}for(;null!==(a=fe(n,function(t){i.error=t;},ce));)switch(a.type){case he.Artboards:Ce(i,a.reader);break;case he.Atlases:o++,Se(i,a.reader,function(){l();});break;case he.NestedActorAssets:be(i,a.reader);}l();}function Ae(t,e){e._Name=t.readString("name"),t.readFloat32Array(e._Translation,"translation"),e._Width=t.readFloat32("width"),e._Height=t.readFloat32("height"),t.readFloat32Array(e._Origin,"origin"),e._ClipContents=t.readBool("clipContents"),t.readFloat32Array(e._Color,"color");let r=null;for(;null!==(r=fe(t,function(t){e.actor.error=t;},ce));)switch(r.type){case he.Nodes:pe(e,r.reader);break;case he.Animations:ge(e,r.reader);}return e}function Me(t,e){return e._Name=t.readString("name"),e._ParentIdx=t.readId("parent"),e}function Te(t,e){return Me(t,e),e._Opacity=t.readFloat32("opacity"),e}function we(t,e,r){switch(Me(t,e),r){case he.CustomIntProperty:e._PropertyType=ut.Type.Integer,e._Value=t.readInt32("int");break;case he.CustomFloatProperty:e._PropertyType=ut.Type.Float,e._Value=t.readFloat32("float");break;case he.CustomStringProperty:e._PropertyType=ut.Type.String,e._Value=t.readString("string");break;case he.CustomBooleanProperty:e._PropertyType=ut.Type.Boolean,e._Value=t.readBool("bool");}return e}function ke(t,e,r){return Re(t,e,r),r._IsCollisionEnabled=e.readBool("isCollisionEnabled"),r}function Pe(t,e,r){return ke(t,e,r),r._Width=e.readFloat32("width"),r._Height=e.readFloat32("height"),r}function ve(t,e,r){return ke(t,e,r),r._Width=e.readFloat32("width"),r._Height=e.readFloat32("height"),r}function xe(t,e,r){return ke(t,e,r),r._Radius=e.readFloat32("radius"),r}function Oe(t,e,r){ke(t,e,r);const n=e.readUint32("cc");return r._ContourVertices=new Float32Array(2*n),e.readFloat32Array(r._ContourVertices,"countour"),r}function De(t,e,r){ke(t,e,r);const n=e.readUint32("lineDataLength");return r._Vertices=new Float32Array(2*n),e.readFloat32Array(r._Vertices,"lineData"),r}function Fe(t,e){return Me(t,e),e}function Re(t,e,r){Me(e,r),e.readFloat32Array(r._Translation,"translation"),r._Rotation=e.readFloat32("rotation"),e.readFloat32Array(r._Scale,"scale"),r._Opacity=e.readFloat32("opacity"),r._IsCollapsedVisibility=e.readBool("isCollapsed"),e.openArray("clips");const n=e.readUint8Length();if(n){r._Clips=[];for(let s=0;s<n;s++){const n={idx:e.readId("clip"),intersect:!0};t>=23&&(n.intersect=e.readBool("intersect")),r._Clips.push(n);}}return e.closeArray(),r}function Be(t,e,r){return Re(t,e,r),r._ActiveChildIndex=e.readUint32("activeChild"),r}function Ee(t,e,r){return Re(t,e,r),r._Length=e.readFloat32("length"),r}function Ve(t,e){return Me(t,e),e._Opacity=t.readFloat32("opacity"),e._IsCollapsedVisibility=t.readBool("isCollapsedVisibility"),e}function Le(t,e){return Me(t,e),e._EaseIn=t.readFloat32("easeIn"),e._EaseOut=t.readFloat32("easeOut"),e._ScaleIn=t.readFloat32("scaleIn"),e._ScaleOut=t.readFloat32("scaleOut"),e._InTargetIdx=t.readId("inTarget"),e._OutTargetIdx=t.readId("outTarget"),e}function Ue(t,e,r){return Re(t,e,r),r}function Ne(t,e,r){Re(t,e,r),r._Strength=e.readFloat32(),r._InvertDirection=1===e.readUint8();let n=e.readUint8();if(n>0){r._InfluencedBones=[];for(let t=0;t<n;t++)r._InfluencedBones.push(e.readUint16());}return r}function We(t,e){!function(t,e){Me(t,e),e._Strength=t.readFloat32("strength"),e._IsEnabled=t.readBool("isEnabled");}(t,e),e._TargetIdx=t.readId("target");}function Xe(t,e){We(t,e),e._InvertDirection=t.readBool("isInverted"),t.openArray("bones");const r=t.readUint8Length();if(r>0){e._InfluencedBones=[];for(let n=0;n<r;n++)e._InfluencedBones.push(t.readId(""));}return t.closeArray(),e}function Ge(t,e){return We(t,e),e._Distance=t.readFloat32("distance"),e._Mode=t.readUint8("modeId"),e}function He(t,e){return We(t,e),e._SourceSpace=t.readUint8("sourceSpaceId"),e._DestSpace=t.readUint8("destSpaceId"),e}function qe(t,e){return We(t,e),(e._Copy=t.readBool("copy"))&&(e._Scale=t.readFloat32("scale")),(e._EnableMin=t.readBool("enableMin"))&&(e._Min=t.readFloat32("min")),(e._EnableMax=t.readBool("enableMax"))&&(e._Max=t.readFloat32("max")),e._Offset=t.readBool("offset"),e._SourceSpace=t.readUint8("sourceSpaceId"),e._DestSpace=t.readUint8("destSpaceId"),e._MinMaxSpace=t.readUint8("minMaxSpaceId"),e}function Ye(t,e){return We(t,e),(e._CopyX=t.readBool("copyX"))&&(e._ScaleX=t.readFloat32("scaleX")),(e._EnableMinX=t.readBool("enableMinX"))&&(e._MinX=t.readFloat32("minX")),(e._EnableMaxX=t.readBool("enableMaxX"))&&(e._MaxX=t.readFloat32("maxX")),(e._CopyY=t.readBool("copyY"))&&(e._ScaleY=t.readFloat32("scaleY")),(e._EnableMinY=t.readBool("enableMinY"))&&(e._MinY=t.readFloat32("minY")),(e._EnableMaxY=t.readBool("enableMaxY"))&&(e._MaxY=t.readFloat32("maxY")),e._Offset=t.readBool("offset"),e._SourceSpace=t.readUint8("sourceSpaceId"),e._DestSpace=t.readUint8("destSpaceId"),e._MinMaxSpace=t.readUint8("minMaxSpaceId"),e}function je(t,e,r){return lr(t,e,r),t>=22&&(r._TransformAffectsStroke=e.readBool("transformAffectsStroke")),r}function ze(t,e,r){return Re(t,e,r),r._Width=e.readFloat32("width"),r._Height=e.readFloat32("height"),r}function Ke(t,e,r){return ze(t,e,r),r._Points=e.readUint32("points"),r._InnerRadius=e.readFloat32("innerRadius"),r}function Je(t,e,r){return ze(t,e,r),r._CornerRadius=e.readFloat32("cornerRadius"),r}function Qe(t,e,r){return ze(t,e,r),r._Sides=e.readUint32("sides"),r}function Ze(t,e,r){return ze(t,e,r),r}function $e(t,e,r){return ze(t,e,r),r}function tr(t,e){return Te(t,e),t.readFloat32Array(e._Color,"color"),e._FillRule=t.readUint8("fillRule"),e}function er(t,e){e._Width=t.readFloat32("width"),e._Cap=t.readUint8("cap"),e._Join=t.readUint8("join"),e._Trim=t.readUint8("trim"),e._Trim!==de&&(e._TrimStart=t.readFloat32("start"),e._TrimEnd=t.readFloat32("end"),e._TrimOffset=t.readFloat32("offset"));}function rr(t,e){return Te(t,e),t.readFloat32Array(e._Color,"color"),er(t,e),e}function nr(t,e){const r=t.readUint8("numColorStops"),n=new Float32Array(5*r);return t.readFloat32Array(n,"colorStops"),e._ColorStops=n,t.readFloat32Array(e._Start,"start"),t.readFloat32Array(e._End,"end"),e}function sr(t,e){return nr(t,e),e._SecondaryRadiusScale=t.readFloat32("secondaryRadiusScale"),e}function ir(t,e){return Te(t,e),nr(t,e),e._FillRule=t.readUint8("fillRule"),e}function ar(t,e){return Te(t,e),nr(t,e),er(t,e),e}function or(t,e){return Te(t,e),sr(t,e),e._FillRule=t.readUint8("fillRule"),e}function cr(t,e){return Te(t,e),sr(t,e),er(t,e),e}function lr(t,e,r){Re(t,e,r),r._IsHidden=!e.readBool("isVisible");const n=e.readUint8("blendMode");return r._BlendMode=le.a.fromID(n),r._DrawOrder=e.readUint16("drawOrder"),r}function hr(t,e){t.openArray("bones");const r=t.readUint8Length();if(r>0){e._ConnectedBones=[];for(let n=0;n<r;n++){t.openObject("bone");const r=k.a.create(),n=t.readId("component");t.readFloat32Array(r,"bind"),t.closeObject(),e._ConnectedBones.push({componentIndex:n,bind:r,ibind:k.a.invert(k.a.create(),r)});}t.closeArray();const n=k.a.create();t.readFloat32Array(n,"worldTransform"),k.a.copy(e._WorldTransform,n),e._OverrideWorldTransform=!0;}else t.closeArray();}function dr(t,e,r){Re(t,e,r),hr(e,r),r._IsHidden=!e.readBool("isVisible"),r._IsClosed=e.readBool("isClosed"),e.openArray("points");const n=e.readUint16Length(),s=new Array(n),i=r._ConnectedBones&&r._ConnectedBones.length>0;for(let t=0;t<n;t++){e.openObject("point");const r=e.readUint8("pointType");let n=null;switch(r){case l.b.Straight:n=new l.c,e.readFloat32Array(n._Translation,"translation"),n._Radius=e.readFloat32("radius"),i&&(n._Weights=new Float32Array(8));break;default:n=new l.a,e.readFloat32Array(n._Translation,"translation"),e.readFloat32Array(n._In,"in"),e.readFloat32Array(n._Out,"out"),i&&(n._Weights=new Float32Array(24));}if(n._Weights&&e.readFloat32Array(n._Weights,"weights"),e.closeObject(),!n)throw new Error("Invalid point type "+r);n._PointType=r,s[t]=n;}return e.closeArray(),r._Points=s,r}function ur(t,e,r){if(lr(t,e,r),hr(e,r),!r.isHidden){r._AtlasIndex=e.readUint8("atlas");const t=e.readUint32("numVertices"),n=r.isConnectedToBones?12:4;r._NumVertices=t,r._VertexStride=n,r._Vertices=new Float32Array(t*n),e.readFloat32Array(r._Vertices,"vertices");const s=e.readUint32("numTriangles");r._Triangles=new Uint16Array(3*s),e.readUint16Array(r._Triangles,"triangles");}return r}function _r(t,e,r){if(ur(t,e,r),-1!=r._AtlasIndex){e.openArray("frames");const t=e.readUint16Length();r._SequenceFrames=[];const n=new Float32Array(2*r._NumVertices*t),s=2*r._NumVertices;r._SequenceUVs=n;const i={atlas:r._AtlasIndex,offset:0};r._SequenceFrames.push(i);let a=2,o=0;for(let t=0;t<r._NumVertices;t++)n[o++]=r._Vertices[a],n[o++]=r._Vertices[a+1],a+=r._VertexStride;let c=s;for(let i=1;i<t;i++){e.openObject("frame");let t={atlas:e.readUint8("atlas"),offset:4*c};r._SequenceFrames.push(t),e.readFloat32ArrayOffset(n,s,c,"uv"),e.closeObject(),c+=s;}e.closeArray();}return r}function fr(t,e,r,n){if(Re(t,e,r),e.readUint8()){r._DrawOrder=e.readUint16();let t=e.readUint16();t<n.length&&(r._Asset=n[t]);}return r}class pr{load(t,e){let r=this;if(t.constructor===String){let n=new XMLHttpRequest;n.open("GET",t,!0),n.responseType="blob",n.onload=function(){let t=new FileReader;t.onload=function(){Ie(r,this.result,e);},t.readAsArrayBuffer(this.response);},n.send();}else {let n=new FileReader;n.onload=function(){Ie(r,this.result,e);},n.readAsArrayBuffer(t);}}}}])});

    });

    var Flare = unwrapExports(Flare_min);
    var Flare_min_1 = Flare_min.Flare;

    /**
     * Common utilities
     * @module glMatrix
     */
    var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
    if (!Math.hypot) Math.hypot = function () {
      var y = 0,
          i = arguments.length;

      while (i--) {
        y += arguments[i] * arguments[i];
      }

      return Math.sqrt(y);
    };

    /**
     * 2x3 Matrix
     * @module mat2d
     * @description
     * A mat2d contains six elements defined as:
     * <pre>
     * [a, b,
     *  c, d,
     *  tx, ty]
     * </pre>
     * This is a short form for the 3x3 matrix:
     * <pre>
     * [a, b, 0,
     *  c, d, 0,
     *  tx, ty, 1]
     * </pre>
     * The last column is ignored so the array is shorter and operations are faster.
     */

    /**
     * Creates a new identity mat2d
     *
     * @returns {mat2d} a new 2x3 matrix
     */

    function create() {
      var out = new ARRAY_TYPE(6);

      if (ARRAY_TYPE != Float32Array) {
        out[1] = 0;
        out[2] = 0;
        out[4] = 0;
        out[5] = 0;
      }

      out[0] = 1;
      out[3] = 1;
      return out;
    }

    //npm install @2dimensions/flare-js

    const FlareInterface = (function ()
    {
    	//const _ViewCenter = [0, 0];
    	const _Scale = 1;
    	//const _ScreenScale = 1.0;

    	//const _ScreenMouse = vec2.create();
    	//const _WorldMouse = vec2.create();

    	/**
    	 * @constructs FlareInterface
    	 * 
    	 * @param {Element} canvas - a canvas element object on the html page that's rendering this example.
    	 * @param {onReadyCallback} ready - callback that's called after everything's been properly initialized.
    	*/
    	function FlareInterface(location='./',canvas, ready)
    	{
    		if(!location.endsWith("/"))
    			location +="/";
    		this.onAnimationChangeCallback = undefined;
    		this.lastAnimationEnded = undefined;
    		this.frameAspectRatio = 0;

    		/** Build and initialize the Graphics object. */
    		this._Graphics = new Flare.Graphics(canvas);
    		this._Graphics.initialize(() =>
    		{
    			this._LastAdvanceTime = Date.now();
    			this._ViewTransform = create();
    			this._AnimationInstance = null;
    			this._Animation = null;
    			this._SoloSkaterAnimation = null;

    			const _This = this;
    			
    			/** Start the render loop. */
    			_ScheduleAdvance(_This);
    			_Advance(_This);
    			/** Call-back. */
    			ready(_This);
    		}, location,);
    	}

    	/**
    	 * Advance the current viewport and, if present, the AnimationInstance and Actor.
    	 * 
    	 * @param {Object} _This - the current viewer.
    	 */
    	function _Advance(_This)
    	{
    		//_This.setSize(window.innerWidth, window.innerHeight);

    		const now = Date.now();
    		const elapsed = (now - _This._LastAdvanceTime)/1000.0;
    		_This._LastAdvanceTime = now;

    		const actor = _This._ActorInstance;

    		if(_This._AnimationInstance)
    		{
    			const ai = _This._AnimationInstance;
    			/** Compute the new time and apply it */
    			ai.time = ai.time + elapsed;
    			ai.apply(_This._ActorInstance, 1.0);
    		}

    		if(actor)
    		{
    			const graphics = _This._Graphics;
    		
    			const w = graphics.viewportWidth;
    			const h = graphics.viewportHeight;

    			const vt = _This._ViewTransform;
    			vt[0] = _Scale;
    			vt[3] = _Scale;
    			//vt[4] = (-_ViewCenter[0] * _Scale + w/2);
    			//vt[5] = (-_ViewCenter[1] * _Scale + h/2);
    			vt[4] = 0;
    			vt[5] = 0;
    			/** Advance the actor to its new time. */
    			actor.advance(elapsed);
    		}

    		_Draw(_This, _This._Graphics);
    		/** Schedule a new frame. */
    		_ScheduleAdvance(_This);

    		if(_This._AnimationInstance && _This._AnimationInstance.isOver && _This.lastAnimationEnded !== _This._AnimationInstance){
    			_This.lastAnimationEnded = _This._AnimationInstance;
    			if(_This.onAnimationChangeCallback && _This.lastAnimationEnded)
    			_This.onAnimationChangeCallback(_This.lastAnimationEnded._Animation._Name,null);
    		}
    	}

    	/**
    	 * Performs the drawing operation onto the canvas.
    	 * 
    	 * @param {Object} viewer - the object containing the reference to the Actor that'll be drawn.
    	 * @param {Object} graphics - the renderer.
    	 */
    	function _Draw(viewer, graphics)
    	{
    		if(!viewer._Actor)
    		{
    			return;
    		}
            graphics.clear([0, 0, 0, 0]);
    		graphics.setView(viewer._ViewTransform);
    		viewer._ActorInstance.draw(graphics);
    		graphics.flush();
    	}

    	/** Schedule the next frame. */
    	function _ScheduleAdvance(viewer)
    	{
    		clearTimeout(viewer._AdvanceTimeout);
    		window.requestAnimationFrame(function()
    			{
    				_Advance(viewer);
    			}
    		);
    	}

    	FlareInterface.prototype.onAnimationChange = function(callback)
    	{
    		this.onAnimationChangeCallback = callback;
    	};

    	/**
    	 * Loads the Flare file from disk.
    	 * 
    	 * @param {string} url - the .flr file location.
    	 * @param {onSuccessCallback} callback - the callback that's triggered upon a successful load.
    	 */ 
    	FlareInterface.prototype.load = function(url, callback)
    	{
    		const loader = new Flare.ActorLoader();
    		const _This = this;
    		loader.load(url, function(actor)
    		{
    			if(!actor || actor.error)
    			{
    				callback(!actor ? null : actor.error);
    			}
    			else
    			{
    				_This.setActor(actor);
    				callback();
    			}
    		});
    	};

    	/**
    	 * Cleans up old resources, and then initializes Actors and Animations, storing the instance references for both.
    	 * This is the final step of the setup process for a Flare file.
    	 */
    	FlareInterface.prototype.setActor = function(actor)
    	{
    		/** Cleanup */
    		if(this._Actor)
    		{
    			this._Actor.dispose(this._Graphics);
    		}
    		if(this._ActorInstance)
    		{
    			this._ActorInstance.dispose(this._Graphics);
    		}
    		/** Initialize all the Artboards within this Actor. */
    		actor.initialize(this._Graphics);

    		/** Creates new ActorArtboard instance */
    		const actorInstance = actor.makeInstance();
    		actorInstance.initialize(this._Graphics);
    		
    		this._Actor = actor;
    		this._ActorInstance = actorInstance;

    		if(actorInstance)
    		{
    			/** ActorArtboard.initialize() */
    			actorInstance.initialize(this._Graphics);
    			this.setAnimationByIndex(0);
    		}
    	};

    	FlareInterface.prototype.setAnimationByName = function(animationName){
    		if(!this._ActorInstance) return;
    		if(this._ActorInstance._Animations.length)
    		{
    			/** Instantiate the Animation. */
    			for(let i = 0; i < this._ActorInstance._Animations.length; i++){
    				if(this._ActorInstance._Animations[i]._Name === animationName){
    					this._Animation = this._ActorInstance._Animations[i];
    					this.lastAnimationEnded = this._AnimationInstance;
    					this._AnimationInstance = new Flare.AnimationInstance(this._Animation._Actor, this._Animation);
    					this.frameAspectRatio = this._ActorInstance._Width / this._ActorInstance._Height;
    					if(this.onAnimationChangeCallback && this.lastAnimationEnded)
    						this.onAnimationChangeCallback(this.lastAnimationEnded._Animation._Name,animationName);
    				}
    			}
    			
    			if(!this._AnimationInstance) 
    			{
    				console.log("NO ANIMATION IN HERE!?"); 
    				return;
    			}
    		}
    		if(this._ActorInstance && this._ActorInstance._Width && this._ActorInstance._Height)
    			this._Graphics.setSize(this._ActorInstance._Width,this._ActorInstance._Height);
    	};

    	FlareInterface.prototype.setAnimationByIndex = function(animationIndex){
    		if(!this._ActorInstance) return;
    		if(this._ActorInstance._Animations.length)
    		{
    			/** Instantiate the Animation. */
    			this._Animation = this._ActorInstance._Animations[animationIndex];
    			
    			this.lastAnimationEnded = this._AnimationInstance;
    			this._AnimationInstance = new Flare.AnimationInstance(this._Animation._Actor, this._Animation);
    			this.frameAspectRatio = this._ActorInstance._Width / this._ActorInstance._Height;
    			if(this.onAnimationChangeCallback && this.lastAnimationEnded)
    				this.onAnimationChangeCallback(this.lastAnimationEnded._Animation._Name,animationName);

    			if(!this._AnimationInstance) 
    			{
    				console.log("NO ANIMATION IN HERE!?"); 
    				return;
    			}

    		}
    		if(this._ActorInstance && this._ActorInstance._Width && this._ActorInstance._Height)
    			this._Graphics.setSize(this._ActorInstance._Width,this._ActorInstance._Height);
    	};
    	FlareInterface.prototype.getFrameAspectRatio = function(){
    		return this.frameAspectRatio;
    	};
    	/*FlareInterface.prototype.getCenter = function(){
    		return this._ViewCenter;
    	};

    	FlareInterface.prototype.setCenter = function(x,y){
    		this._ViewCenter = [x,y];
    	};*/

    	/** Set the renderer's viewport to the desired width/height. */
    	/*FlareInterface.prototype.setSize = function(width, height)
    	{
    		this._Graphics.setSize(width, height);
    	};*/

    	return FlareInterface;
    }());

    /* src\flare\Flare.svelte generated by Svelte v3.24.0 */
    const file = "src\\flare\\Flare.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let canvas;
    	let canvas_style_value;
    	let init_action;
    	let t;
    	let div_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[34].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[33], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas = element("canvas");
    			t = space();
    			if (default_slot) default_slot.c();

    			attr_dev(canvas, "style", canvas_style_value = "position:relative;" + (/*_width*/ ctx[21]
    			? " width:" + /*_width*/ ctx[21] + "px;"
    			: "") + (/*_height*/ ctx[22]
    			? " height:" + /*_height*/ ctx[22] + "px;"
    			: ""));

    			add_location(canvas, file, 131, 4, 3650);
    			attr_dev(div, "id", /*id*/ ctx[0]);
    			attr_dev(div, "name", /*name*/ ctx[1]);

    			attr_dev(div, "style", div_style_value = "position:relative;display:inline-block;" + (/*_width*/ ctx[21]
    			? " width:" + /*_width*/ ctx[21] + "px;"
    			: "") + (/*_height*/ ctx[22]
    			? " height:" + /*_height*/ ctx[22] + "px;"
    			: "") + (/*style*/ ctx[2] ? " " + /*style*/ ctx[2] : ""));

    			attr_dev(div, "class", /*cls*/ ctx[20]);
    			add_location(div, file, 106, 0, 3040);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas);
    			append_dev(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(init_action = /*init*/ ctx[23].call(null, canvas)),
    					listen_dev(
    						div,
    						"keydown",
    						function () {
    							if (is_function(/*onkeydown*/ ctx[3])) /*onkeydown*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"keydown",
    						function () {
    							if (is_function(/*onkeypress*/ ctx[4])) /*onkeypress*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"keydown",
    						function () {
    							if (is_function(/*onkeyup*/ ctx[5])) /*onkeyup*/ ctx[5].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*onclick*/ ctx[6])) /*onclick*/ ctx[6].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dblclick",
    						function () {
    							if (is_function(/*ondblclick*/ ctx[7])) /*ondblclick*/ ctx[7].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"mousedown",
    						function () {
    							if (is_function(/*onmousedown*/ ctx[8])) /*onmousedown*/ ctx[8].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"mousemove",
    						function () {
    							if (is_function(/*onmousemove*/ ctx[9])) /*onmousemove*/ ctx[9].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"mouseout",
    						function () {
    							if (is_function(/*onmouseout*/ ctx[10])) /*onmouseout*/ ctx[10].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"mouseover",
    						function () {
    							if (is_function(/*onmouseover*/ ctx[11])) /*onmouseover*/ ctx[11].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"mouseup",
    						function () {
    							if (is_function(/*onmouseup*/ ctx[12])) /*onmouseup*/ ctx[12].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"onwheel",
    						function () {
    							if (is_function(/*onwheel*/ ctx[13])) /*onwheel*/ ctx[13].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"drag",
    						function () {
    							if (is_function(/*ondrag*/ ctx[14])) /*ondrag*/ ctx[14].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dragend",
    						function () {
    							if (is_function(/*ondragend*/ ctx[15])) /*ondragend*/ ctx[15].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dragenter",
    						function () {
    							if (is_function(/*ondragenter*/ ctx[16])) /*ondragenter*/ ctx[16].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dragleave",
    						function () {
    							if (is_function(/*ondragleave*/ ctx[17])) /*ondragleave*/ ctx[17].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dragover",
    						function () {
    							if (is_function(/*ondragover*/ ctx[18])) /*ondragover*/ ctx[18].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div,
    						"dragstart",
    						function () {
    							if (is_function(/*ondragstart*/ ctx[19])) /*ondragstart*/ ctx[19].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty[0] & /*_width, _height*/ 6291456 && canvas_style_value !== (canvas_style_value = "position:relative;" + (/*_width*/ ctx[21]
    			? " width:" + /*_width*/ ctx[21] + "px;"
    			: "") + (/*_height*/ ctx[22]
    			? " height:" + /*_height*/ ctx[22] + "px;"
    			: ""))) {
    				attr_dev(canvas, "style", canvas_style_value);
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty[1] & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[33], dirty, null, null);
    				}
    			}

    			if (!current || dirty[0] & /*id*/ 1) {
    				attr_dev(div, "id", /*id*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*name*/ 2) {
    				attr_dev(div, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty[0] & /*_width, _height, style*/ 6291460 && div_style_value !== (div_style_value = "position:relative;display:inline-block;" + (/*_width*/ ctx[21]
    			? " width:" + /*_width*/ ctx[21] + "px;"
    			: "") + (/*_height*/ ctx[22]
    			? " height:" + /*_height*/ ctx[22] + "px;"
    			: "") + (/*style*/ ctx[2] ? " " + /*style*/ ctx[2] : ""))) {
    				attr_dev(div, "style", div_style_value);
    			}

    			if (!current || dirty[0] & /*cls*/ 1048576) {
    				attr_dev(div, "class", /*cls*/ ctx[20]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { filename = undefined } = $$props;
    	let { onload = undefined } = $$props;
    	let { animation = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { name = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { width = undefined } = $$props;
    	let { height = undefined } = $$props;
    	let { frameAspectRatio = undefined } = $$props;
    	let { autoresolve = "height" } = $$props;
    	let _autoresolve = autoresolve;
    	let _width = width;
    	let _height = height;

    	function onWidthChange(w) {
    		$$invalidate(21, _width = w);
    		autoresolveAnimationFrameRatio();
    	}

    	function onHeightChange(h) {
    		$$invalidate(22, _height = h);
    		autoresolveAnimationFrameRatio();
    	}

    	function onAutoresolveChange(a) {
    		_autoresolve = a;
    		autoresolveAnimationFrameRatio();
    	}

    	function autoresolveAnimationFrameRatio(width__, height__) {
    		if (!fi) return;
    		$$invalidate(24, frameAspectRatio = getFrameAspectRatio());

    		if (_autoresolve === "height" && (width || width === 0)) {
    			$$invalidate(22, _height = frameAspectRatio === 0 ? 0 : width / frameAspectRatio);
    			$$invalidate(21, _width = width);
    		} else if (_autoresolve === "width" && (height || height === 0)) {
    			$$invalidate(21, _width = frameAspectRatio * height);
    			$$invalidate(22, _height = height);
    		} else {
    			if (height !== undefined && height === undefined) {
    				$$invalidate(25, autoresolve = "height");
    			} else if (width === undefined && width !== undefined) {
    				$$invalidate(25, autoresolve = "width");
    			} else {
    				$$invalidate(25, autoresolve = "width");
    			}
    		}
    	}

    	let { onanimation = undefined } = $$props;
    	let { onkeydown = undefined } = $$props;
    	let { onkeypress = undefined } = $$props;
    	let { onkeyup = undefined } = $$props;
    	let { onclick = undefined } = $$props;
    	let { ondblclick = undefined } = $$props;
    	let { onmousedown = undefined } = $$props;
    	let { onmousemove = undefined } = $$props;
    	let { onmouseout = undefined } = $$props;
    	let { onmouseover = undefined } = $$props;
    	let { onmouseup = undefined } = $$props;
    	let { onwheel = undefined } = $$props;
    	let { ondrag = undefined } = $$props;
    	let { ondragend = undefined } = $$props;
    	let { ondragenter = undefined } = $$props;
    	let { ondragleave = undefined } = $$props;
    	let { ondragover = undefined } = $$props;
    	let { ondragstart = undefined } = $$props;
    	let { class: cls } = $$props;
    	let fi;
    	let loaded = false;

    	function getFrameAspectRatio() {
    		if (!fi) return 0;
    		return fi.getFrameAspectRatio();
    	}

    	function init(e) {
    		new FlareInterface("./build/canvaskit",
    		e,
    		o => {
    				$$invalidate(36, fi = o);

    				fi.load(filename, error => {
    					$$invalidate(37, loaded = true);
    					autoresolveAnimationFrameRatio();

    					fi.onAnimationChange((previous, current) => {
    						autoresolveAnimationFrameRatio();
    						if (onanimation) onanimation(previous, current);
    					});

    					if (onload) onload(fi, error);
    				});
    			});
    	}

    	const writable_props = [
    		"filename",
    		"onload",
    		"animation",
    		"id",
    		"name",
    		"style",
    		"width",
    		"height",
    		"frameAspectRatio",
    		"autoresolve",
    		"onanimation",
    		"onkeydown",
    		"onkeypress",
    		"onkeyup",
    		"onclick",
    		"ondblclick",
    		"onmousedown",
    		"onmousemove",
    		"onmouseout",
    		"onmouseover",
    		"onmouseup",
    		"onwheel",
    		"ondrag",
    		"ondragend",
    		"ondragenter",
    		"ondragleave",
    		"ondragover",
    		"ondragstart",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Flare> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Flare", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("filename" in $$props) $$invalidate(26, filename = $$props.filename);
    		if ("onload" in $$props) $$invalidate(27, onload = $$props.onload);
    		if ("animation" in $$props) $$invalidate(28, animation = $$props.animation);
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("width" in $$props) $$invalidate(29, width = $$props.width);
    		if ("height" in $$props) $$invalidate(30, height = $$props.height);
    		if ("frameAspectRatio" in $$props) $$invalidate(24, frameAspectRatio = $$props.frameAspectRatio);
    		if ("autoresolve" in $$props) $$invalidate(25, autoresolve = $$props.autoresolve);
    		if ("onanimation" in $$props) $$invalidate(31, onanimation = $$props.onanimation);
    		if ("onkeydown" in $$props) $$invalidate(3, onkeydown = $$props.onkeydown);
    		if ("onkeypress" in $$props) $$invalidate(4, onkeypress = $$props.onkeypress);
    		if ("onkeyup" in $$props) $$invalidate(5, onkeyup = $$props.onkeyup);
    		if ("onclick" in $$props) $$invalidate(6, onclick = $$props.onclick);
    		if ("ondblclick" in $$props) $$invalidate(7, ondblclick = $$props.ondblclick);
    		if ("onmousedown" in $$props) $$invalidate(8, onmousedown = $$props.onmousedown);
    		if ("onmousemove" in $$props) $$invalidate(9, onmousemove = $$props.onmousemove);
    		if ("onmouseout" in $$props) $$invalidate(10, onmouseout = $$props.onmouseout);
    		if ("onmouseover" in $$props) $$invalidate(11, onmouseover = $$props.onmouseover);
    		if ("onmouseup" in $$props) $$invalidate(12, onmouseup = $$props.onmouseup);
    		if ("onwheel" in $$props) $$invalidate(13, onwheel = $$props.onwheel);
    		if ("ondrag" in $$props) $$invalidate(14, ondrag = $$props.ondrag);
    		if ("ondragend" in $$props) $$invalidate(15, ondragend = $$props.ondragend);
    		if ("ondragenter" in $$props) $$invalidate(16, ondragenter = $$props.ondragenter);
    		if ("ondragleave" in $$props) $$invalidate(17, ondragleave = $$props.ondragleave);
    		if ("ondragover" in $$props) $$invalidate(18, ondragover = $$props.ondragover);
    		if ("ondragstart" in $$props) $$invalidate(19, ondragstart = $$props.ondragstart);
    		if ("class" in $$props) $$invalidate(20, cls = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(33, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		FlareInterface,
    		filename,
    		onload,
    		animation,
    		id,
    		name,
    		style,
    		width,
    		height,
    		frameAspectRatio,
    		autoresolve,
    		_autoresolve,
    		_width,
    		_height,
    		onWidthChange,
    		onHeightChange,
    		onAutoresolveChange,
    		autoresolveAnimationFrameRatio,
    		onanimation,
    		onkeydown,
    		onkeypress,
    		onkeyup,
    		onclick,
    		ondblclick,
    		onmousedown,
    		onmousemove,
    		onmouseout,
    		onmouseover,
    		onmouseup,
    		onwheel,
    		ondrag,
    		ondragend,
    		ondragenter,
    		ondragleave,
    		ondragover,
    		ondragstart,
    		cls,
    		fi,
    		loaded,
    		getFrameAspectRatio,
    		init
    	});

    	$$self.$inject_state = $$props => {
    		if ("filename" in $$props) $$invalidate(26, filename = $$props.filename);
    		if ("onload" in $$props) $$invalidate(27, onload = $$props.onload);
    		if ("animation" in $$props) $$invalidate(28, animation = $$props.animation);
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("width" in $$props) $$invalidate(29, width = $$props.width);
    		if ("height" in $$props) $$invalidate(30, height = $$props.height);
    		if ("frameAspectRatio" in $$props) $$invalidate(24, frameAspectRatio = $$props.frameAspectRatio);
    		if ("autoresolve" in $$props) $$invalidate(25, autoresolve = $$props.autoresolve);
    		if ("_autoresolve" in $$props) _autoresolve = $$props._autoresolve;
    		if ("_width" in $$props) $$invalidate(21, _width = $$props._width);
    		if ("_height" in $$props) $$invalidate(22, _height = $$props._height);
    		if ("onanimation" in $$props) $$invalidate(31, onanimation = $$props.onanimation);
    		if ("onkeydown" in $$props) $$invalidate(3, onkeydown = $$props.onkeydown);
    		if ("onkeypress" in $$props) $$invalidate(4, onkeypress = $$props.onkeypress);
    		if ("onkeyup" in $$props) $$invalidate(5, onkeyup = $$props.onkeyup);
    		if ("onclick" in $$props) $$invalidate(6, onclick = $$props.onclick);
    		if ("ondblclick" in $$props) $$invalidate(7, ondblclick = $$props.ondblclick);
    		if ("onmousedown" in $$props) $$invalidate(8, onmousedown = $$props.onmousedown);
    		if ("onmousemove" in $$props) $$invalidate(9, onmousemove = $$props.onmousemove);
    		if ("onmouseout" in $$props) $$invalidate(10, onmouseout = $$props.onmouseout);
    		if ("onmouseover" in $$props) $$invalidate(11, onmouseover = $$props.onmouseover);
    		if ("onmouseup" in $$props) $$invalidate(12, onmouseup = $$props.onmouseup);
    		if ("onwheel" in $$props) $$invalidate(13, onwheel = $$props.onwheel);
    		if ("ondrag" in $$props) $$invalidate(14, ondrag = $$props.ondrag);
    		if ("ondragend" in $$props) $$invalidate(15, ondragend = $$props.ondragend);
    		if ("ondragenter" in $$props) $$invalidate(16, ondragenter = $$props.ondragenter);
    		if ("ondragleave" in $$props) $$invalidate(17, ondragleave = $$props.ondragleave);
    		if ("ondragover" in $$props) $$invalidate(18, ondragover = $$props.ondragover);
    		if ("ondragstart" in $$props) $$invalidate(19, ondragstart = $$props.ondragstart);
    		if ("cls" in $$props) $$invalidate(20, cls = $$props.cls);
    		if ("fi" in $$props) $$invalidate(36, fi = $$props.fi);
    		if ("loaded" in $$props) $$invalidate(37, loaded = $$props.loaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*width*/ 536870912) {
    			 onWidthChange(width);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 1073741824) {
    			 onHeightChange(height);
    		}

    		if ($$self.$$.dirty[0] & /*autoresolve*/ 33554432) {
    			 onAutoresolveChange(autoresolve);
    		}

    		if ($$self.$$.dirty[0] & /*animation*/ 268435456 | $$self.$$.dirty[1] & /*fi, loaded*/ 96) {
    			 {
    				if (fi && loaded && animation) {
    					fi.setAnimationByName(animation);
    				}
    			}
    		}
    	};

    	return [
    		id,
    		name,
    		style,
    		onkeydown,
    		onkeypress,
    		onkeyup,
    		onclick,
    		ondblclick,
    		onmousedown,
    		onmousemove,
    		onmouseout,
    		onmouseover,
    		onmouseup,
    		onwheel,
    		ondrag,
    		ondragend,
    		ondragenter,
    		ondragleave,
    		ondragover,
    		ondragstart,
    		cls,
    		_width,
    		_height,
    		init,
    		frameAspectRatio,
    		autoresolve,
    		filename,
    		onload,
    		animation,
    		width,
    		height,
    		onanimation,
    		getFrameAspectRatio,
    		$$scope,
    		$$slots
    	];
    }

    class Flare$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				filename: 26,
    				onload: 27,
    				animation: 28,
    				id: 0,
    				name: 1,
    				style: 2,
    				width: 29,
    				height: 30,
    				frameAspectRatio: 24,
    				autoresolve: 25,
    				onanimation: 31,
    				onkeydown: 3,
    				onkeypress: 4,
    				onkeyup: 5,
    				onclick: 6,
    				ondblclick: 7,
    				onmousedown: 8,
    				onmousemove: 9,
    				onmouseout: 10,
    				onmouseover: 11,
    				onmouseup: 12,
    				onwheel: 13,
    				ondrag: 14,
    				ondragend: 15,
    				ondragenter: 16,
    				ondragleave: 17,
    				ondragover: 18,
    				ondragstart: 19,
    				class: 20,
    				getFrameAspectRatio: 32
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Flare",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*cls*/ ctx[20] === undefined && !("class" in props)) {
    			console.warn("<Flare> was created without expected prop 'class'");
    		}
    	}

    	get filename() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filename(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onload() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onload(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get animation() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set animation(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get frameAspectRatio() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set frameAspectRatio(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoresolve() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoresolve(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onanimation() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onanimation(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onkeydown() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onkeydown(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onkeypress() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onkeypress(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onkeyup() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onkeyup(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onclick() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onclick(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondblclick() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondblclick(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onmousedown() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onmousedown(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onmousemove() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onmousemove(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onmouseout() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onmouseout(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onmouseover() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onmouseover(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onmouseup() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onmouseup(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onwheel() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onwheel(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondrag() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondrag(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondragend() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondragend(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondragenter() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondragenter(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondragleave() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondragleave(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondragover() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondragover(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ondragstart() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ondragstart(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Flare>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getFrameAspectRatio() {
    		return this.$$.ctx[32];
    	}

    	set getFrameAspectRatio(value) {
    		throw new Error("<Flare>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\flare\Toggle.svelte generated by Svelte v3.24.0 */

    function create_fragment$3(ctx) {
    	let flare;
    	let current;

    	flare = new Flare$1({
    			props: {
    				filename: "./assets/switch_daytime.flr",
    				style: "cursor:pointer;",
    				onclick: /*func*/ ctx[5],
    				onanimation: /*onanimation*/ ctx[4],
    				width: /*width*/ ctx[2],
    				height: /*height*/ ctx[3],
    				animation: /*animation*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(flare.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(flare, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const flare_changes = {};
    			if (dirty & /*value*/ 1) flare_changes.onclick = /*func*/ ctx[5];
    			if (dirty & /*animation*/ 2) flare_changes.animation = /*animation*/ ctx[1];
    			flare.$set(flare_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flare.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flare.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flare, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { value = false } = $$props;
    	let width = 100;
    	let height = undefined;
    	let animating = false;

    	function onanimation(previous, current) {
    		switch (previous) {
    			case "switch_night":
    				switch (current) {
    					case null:
    						$$invalidate(1, animation = "night_idle");
    						break;
    				}
    				break;
    			case "switch_day":
    				switch (current) {
    					case null:
    						$$invalidate(1, animation = "day_idle");
    						break;
    				}
    				break;
    		}
    	}

    	const writable_props = ["value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Toggle> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Toggle", $$slots, []);
    	const func = () => $$invalidate(0, value = !value);

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({
    		Flare: Flare$1,
    		value,
    		width,
    		height,
    		animating,
    		onanimation,
    		animation
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("animating" in $$props) animating = $$props.animating;
    		if ("animation" in $$props) $$invalidate(1, animation = $$props.animation);
    	};

    	let animation;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			 $$invalidate(1, animation = value ? "switch_day" : "switch_night");
    		}
    	};

    	return [value, animation, width, height, onanimation, func];
    }

    class Toggle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get value() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\flare\CheckAnimation.svelte generated by Svelte v3.24.0 */

    function create_fragment$4(ctx) {
    	let flare;
    	let current;

    	flare = new Flare$1({
    			props: {
    				filename: "./assets/Check (Lottie Import).flr",
    				width: "100",
    				animation: "Animations"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(flare.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(flare, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flare.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flare.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flare, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CheckAnimation> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CheckAnimation", $$slots, []);
    	$$self.$capture_state = () => ({ Flare: Flare$1 });
    	return [];
    }

    class CheckAnimation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CheckAnimation",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\flare\ComputerAnimation.svelte generated by Svelte v3.24.0 */

    // (6:0) <Flare {style} filename="./assets/Computer Animation.flr" width=500>
    function create_default_slot(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(6:0) <Flare {style} filename=\\\"./assets/Computer Animation.flr\\\" width=500>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let flare;
    	let current;

    	flare = new Flare$1({
    			props: {
    				style: /*style*/ ctx[0],
    				filename: "./assets/Computer Animation.flr",
    				width: "500",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(flare.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(flare, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const flare_changes = {};
    			if (dirty & /*style*/ 1) flare_changes.style = /*style*/ ctx[0];

    			if (dirty & /*$$scope*/ 4) {
    				flare_changes.$$scope = { dirty, ctx };
    			}

    			flare.$set(flare_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flare.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flare.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flare, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { style } = $$props;
    	const writable_props = ["style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ComputerAnimation> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ComputerAnimation", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ Flare: Flare$1, style });

    	$$self.$inject_state = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [style, $$slots, $$scope];
    }

    class ComputerAnimation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { style: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComputerAnimation",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*style*/ ctx[0] === undefined && !("style" in props)) {
    			console.warn("<ComputerAnimation> was created without expected prop 'style'");
    		}
    	}

    	get style() {
    		throw new Error("<ComputerAnimation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<ComputerAnimation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\flare\MultiOptionButton.svelte generated by Svelte v3.24.0 */
    const file$1 = "src\\components\\flare\\MultiOptionButton.svelte";

    // (51:12) {#if opened}
    function create_if_block$1(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			attr_dev(div0, "class", "camera-btn svelte-t85agk");
    			add_location(div0, file$1, 51, 16, 1419);
    			attr_dev(div1, "class", "pulse-btn svelte-t85agk");
    			add_location(div1, file$1, 52, 16, 1485);
    			attr_dev(div2, "class", "image-btn svelte-t85agk");
    			add_location(div2, file$1, 53, 16, 1549);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*camera*/ ctx[4], false, false, false),
    					listen_dev(div1, "click", /*pulse*/ ctx[5], false, false, false),
    					listen_dev(div2, "click", /*image*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(51:12) {#if opened}",
    		ctx
    	});

    	return block;
    }

    // (47:0) <Flare style="position:relative;z-index:0;background:rgba(0,0,0,0.1);{style?" "+style:""}" filename="./assets/MultiOptionButton.flr" width=300 {animation} {onanimation}>
    function create_default_slot$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*opened*/ ctx[2] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "main-btn svelte-t85agk");
    			add_location(div0, file$1, 49, 12, 1331);
    			attr_dev(div1, "class", "floating-wrapper svelte-t85agk");
    			add_location(div1, file$1, 48, 8, 1287);
    			attr_dev(div2, "class", "floating svelte-t85agk");
    			add_location(div2, file$1, 47, 4, 1255);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*main*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*opened*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(47:0) <Flare style=\\\"position:relative;z-index:0;background:rgba(0,0,0,0.1);{style?\\\" \\\"+style:\\\"\\\"}\\\" filename=\\\"./assets/MultiOptionButton.flr\\\" width=300 {animation} {onanimation}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let flare;
    	let current;

    	flare = new Flare$1({
    			props: {
    				style: "position:relative;z-index:0;background:rgba(0,0,0,0.1);" + (/*style*/ ctx[0] ? " " + /*style*/ ctx[0] : ""),
    				filename: "./assets/MultiOptionButton.flr",
    				width: "300",
    				animation: /*animation*/ ctx[1],
    				onanimation: /*onanimation*/ ctx[7],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(flare.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(flare, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const flare_changes = {};
    			if (dirty & /*style*/ 1) flare_changes.style = "position:relative;z-index:0;background:rgba(0,0,0,0.1);" + (/*style*/ ctx[0] ? " " + /*style*/ ctx[0] : "");
    			if (dirty & /*animation*/ 2) flare_changes.animation = /*animation*/ ctx[1];

    			if (dirty & /*$$scope, opened*/ 516) {
    				flare_changes.$$scope = { dirty, ctx };
    			}

    			flare.$set(flare_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flare.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flare.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flare, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { onclick } = $$props;
    	let { style } = $$props;
    	let animation = "deactivate";

    	function main(e) {
    		if (onclick) onclick("main");

    		switch (animation) {
    			case "deactivate":
    				$$invalidate(1, animation = "activate");
    				break;
    			case "activate":
    			case "":
    				$$invalidate(1, animation = "deactivate");
    				break;
    		}
    	}

    	function camera(e) {
    		$$invalidate(1, animation = "camera_tapped");
    		if (onclick) onclick("camera");
    	}

    	function pulse(e) {
    		$$invalidate(1, animation = "pulse_tapped");
    		if (onclick) onclick("pulse");
    	}

    	function image(e) {
    		$$invalidate(1, animation = "image_tapped");
    		if (onclick) onclick("image");
    	}

    	function onanimation(previous, current) {
    		switch (previous) {
    			case "pulse_tapped":
    			case "image_tapped":
    			case "camera_tapped":
    				switch (current) {
    					case "deactivate":
    						break;
    					default:
    						$$invalidate(1, animation = "");
    						break;
    				}
    				break;
    		}
    	}

    	const writable_props = ["onclick", "style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MultiOptionButton> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MultiOptionButton", $$slots, []);

    	$$self.$set = $$props => {
    		if ("onclick" in $$props) $$invalidate(8, onclick = $$props.onclick);
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({
    		Flare: Flare$1,
    		onclick,
    		style,
    		animation,
    		main,
    		camera,
    		pulse,
    		image,
    		onanimation,
    		opened
    	});

    	$$self.$inject_state = $$props => {
    		if ("onclick" in $$props) $$invalidate(8, onclick = $$props.onclick);
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("animation" in $$props) $$invalidate(1, animation = $$props.animation);
    		if ("opened" in $$props) $$invalidate(2, opened = $$props.opened);
    	};

    	let opened;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*animation*/ 2) {
    			 $$invalidate(2, opened = animation !== "deactivate");
    		}
    	};

    	return [style, animation, opened, main, camera, pulse, image, onanimation, onclick];
    }

    class MultiOptionButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { onclick: 8, style: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MultiOptionButton",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onclick*/ ctx[8] === undefined && !("onclick" in props)) {
    			console.warn("<MultiOptionButton> was created without expected prop 'onclick'");
    		}

    		if (/*style*/ ctx[0] === undefined && !("style" in props)) {
    			console.warn("<MultiOptionButton> was created without expected prop 'style'");
    		}
    	}

    	get onclick() {
    		throw new Error("<MultiOptionButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onclick(value) {
    		throw new Error("<MultiOptionButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<MultiOptionButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<MultiOptionButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\HomePage.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;

    // (13:0) <ComputerAnimation>
    function create_default_slot$2(ctx) {
    	let multioptionbutton;
    	let current;

    	multioptionbutton = new MultiOptionButton({
    			props: {
    				style: "position:absolute;left: 0;top:0;",
    				onclick: /*func*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(multioptionbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(multioptionbutton, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(multioptionbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(multioptionbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(multioptionbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(13:0) <ComputerAnimation>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let toggle;
    	let updating_value;
    	let t0;
    	let checkanimation;
    	let t1;
    	let computeranimation;
    	let current;

    	function toggle_value_binding(value) {
    		/*toggle_value_binding*/ ctx[2].call(null, value);
    	}

    	let toggle_props = {};

    	if (/*value*/ ctx[0] !== void 0) {
    		toggle_props.value = /*value*/ ctx[0];
    	}

    	toggle = new Toggle({ props: toggle_props, $$inline: true });
    	binding_callbacks.push(() => bind(toggle, "value", toggle_value_binding));
    	checkanimation = new CheckAnimation({ $$inline: true });

    	computeranimation = new ComputerAnimation({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(toggle.$$.fragment);
    			t0 = space();
    			create_component(checkanimation.$$.fragment);
    			t1 = space();
    			create_component(computeranimation.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(toggle, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(checkanimation, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(computeranimation, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const toggle_changes = {};

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				toggle_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			toggle.$set(toggle_changes);
    			const computeranimation_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				computeranimation_changes.$$scope = { dirty, ctx };
    			}

    			computeranimation.$set(computeranimation_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toggle.$$.fragment, local);
    			transition_in(checkanimation.$$.fragment, local);
    			transition_in(computeranimation.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toggle.$$.fragment, local);
    			transition_out(checkanimation.$$.fragment, local);
    			transition_out(computeranimation.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(toggle, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(checkanimation, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(computeranimation, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { style } = $$props;
    	let value = false;
    	const writable_props = ["style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<HomePage> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("HomePage", $$slots, []);

    	function toggle_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	const func = key => {
    		console.log(key, " clicked!");
    	};

    	$$self.$set = $$props => {
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({
    		Toggle,
    		CheckAnimation,
    		HomeAnimation: ComputerAnimation,
    		ComputerAnimation,
    		MultiOptionButton,
    		style,
    		value
    	});

    	$$self.$inject_state = $$props => {
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			 console.log("Toggle:", value);
    		}
    	};

    	return [value, style, toggle_value_binding, func];
    }

    class HomePage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { style: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HomePage",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*style*/ ctx[1] === undefined && !("style" in props)) {
    			console_1.warn("<HomePage> was created without expected prop 'style'");
    		}
    	}

    	get style() {
    		throw new Error("<HomePage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<HomePage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.24.0 */

    // (8:0) <Router url="{window.location.pathname}">
    function create_default_slot$3(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let current;

    	route0 = new Route({
    			props: { path: "/", component: HomePage },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/home", component: HomePage },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "/index.html", component: HomePage },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(8:0) <Router url=\\\"{window.location.pathname}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: window.location.pathname,
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Router, Route, HomePage });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
