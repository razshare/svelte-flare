<script>
	import {
		Router,
		Route
	} from 'svelte-routing';
	import HomePage from './pages/HomePage.svelte';
</script>
<Router url="{window.location.pathname}">
    <Route path="/" component={HomePage} />
    <Route path="/home" component={HomePage} />
    <Route path="/index.html" component={HomePage} />
</Router>