<script lang="ts">
    import type { Calendar } from "src/@types";

    export let calendar: Calendar;
    export let editing = false;
</script>

<div class="obsical-create">
    <h3>{editing ? "Edit" : "New"} Calendar</h3>
    <div class="content" />
</div>

<style>
    .obsical-create {
        display: grid;
        grid-template-rows: auto 1fr;
    }
</style>
