<script>
import Toggle from "../components/flare/Toggle.svelte";
import CheckAnimation from "../components/flare/CheckAnimation.svelte";
import HomeAnimation from "../components/flare/ComputerAnimation.svelte";
import ComputerAnimation from "../components/flare/ComputerAnimation.svelte";
import MultiOptionButton from "../components/flare/MultiOptionButton.svelte";
let value = false;
$:console.log("Toggle:",value);
</script>
<Toggle bind:value={value} />
<CheckAnimation />
<ComputerAnimation>
    <p style="position:absolute;left:0;max-width:100%;top:0;padding: 1rem">
        You should still be able to select and lcick me through the canvas!
    </p>
    <MultiOptionButton style="position:absolute;left: 0;right:0;top:0" onclick={(key)=>{
        console.log(key," clicked!");
    }}/>
</ComputerAnimation>
