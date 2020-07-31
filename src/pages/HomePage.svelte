<script>
import Toggle from "../components/flare/Toggle.svelte";
import CheckAnimation from "../components/flare/CheckAnimation.svelte";
import HomeAnimation from "../components/flare/ComputerAnimation.svelte";
import ComputerAnimation from "../components/flare/ComputerAnimation.svelte";
import MultiOptionButton from "../components/flare/MultiOptionButton.svelte";
export let style;
let value = false;
$:console.log("Toggle:",value);
</script>
<Toggle bind:value={value} />
<CheckAnimation />
<ComputerAnimation>
    <MultiOptionButton style="position:absolute;left: 0;top:0;" onclick={(key)=>{
        console.log(key," clicked!");
    }}/>
</ComputerAnimation>
