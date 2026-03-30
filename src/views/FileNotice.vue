<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { SelfServiceNotices, SelfServiceAppellants } from '@/service/SelfServiceApi.js';
import { RegionService } from '@/service/SettingsService.js';

const router = useRouter();
const toast = useToast();
const regions = ref([]);
const saving = ref(false);
const appellants = ref([]);
const filteredAppellants = ref([]);
const selectedAppellant = ref(null);

// Quick register
const quickRegister = ref(false);
const newAppellant = ref({ firstName: '', lastName: '', phone: '', email: '', tinNumber: '', vatNumber: '', natureOfBusiness: '', address: '' });

const form = ref({
  appellantId: null,
  loggedAt: new Date().toISOString().split('T')[0],
  dateOfTaxationDecision: '', dateOfServiceDecision: '',
  description: '', regionId: null, additionalRespondent: '',
  isExempted: false, exemptionDateServiceReason: '',
});

onMounted(async () => {
  try {
    const [r, a] = await Promise.all([RegionService.getAll(), SelfServiceAppellants.getAll()]);
    regions.value = r;
    appellants.value = a.map(ap => ({ ...ap, displayName: `${ap.firstName} ${ap.lastName || ''} ${ap.tinNumber ? '(' + ap.tinNumber + ')' : ''}`.trim() }));
  } catch {}
});

const searchAppellant = (e) => {
  const q = (e.query || '').toLowerCase();
  filteredAppellants.value = appellants.value.filter(a => a.displayName.toLowerCase().includes(q));
};

const onAppellantSelect = (e) => {
  selectedAppellant.value = e.value;
  form.value.appellantId = e.value.id;
};

const registerAndSelect = async () => {
  if (!newAppellant.value.firstName) {
    toast.add({ severity: 'warn', summary: 'Required', detail: 'Name is required', life: 3000 });
    return;
  }
  try {
    const created = await SelfServiceAppellants.create(newAppellant.value);
    const ap = { ...created, displayName: `${created.firstName} ${created.lastName || ''} ${created.tinNumber ? '(' + created.tinNumber + ')' : ''}`.trim() };
    appellants.value.push(ap);
    selectedAppellant.value = ap;
    form.value.appellantId = created.id;
    quickRegister.value = false;
    toast.add({ severity: 'success', summary: 'Registered', detail: 'Appellant added and selected', life: 3000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.description || 'Failed', life: 3000 });
  }
};

const submit = async () => {
  saving.value = true;
  try {
    await SelfServiceNotices.create(form.value);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Notice filed successfully!', life: 4000 });
    router.push('/notices');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.description || 'Filing failed', life: 4000 });
  } finally { saving.value = false; }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>File a Notice of Appeal</h2>
      <p>Complete the steps below to file your notice</p>
    </div>

    <div class="ss-card">
      <Stepper value="1" linear>
        <StepList>
          <Step value="1">Select Appellant</Step>
          <Step value="2">Taxation Details</Step>
          <Step value="3">Review & Submit</Step>
        </StepList>
        <StepPanels>
          <!-- Step 1: Select Appellant -->
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="py-4">
              <p class="text-sm mb-3" style="color:#64748B">Select the company or individual you are filing for:</p>
              <div class="flex items-end gap-3 mb-4">
                <div class="flex-1">
                  <label class="field-label">Search Appellant (by name or TIN)</label>
                  <AutoComplete v-model="selectedAppellant" :suggestions="filteredAppellants" optionLabel="displayName"
                    @complete="searchAppellant" @item-select="onAppellantSelect"
                    placeholder="Type to search..." class="w-full" :inputClass="'w-full'" dropdown />
                </div>
                <Button label="Register New" icon="pi pi-plus" outlined size="small" @click="quickRegister = true" style="white-space:nowrap" />
              </div>

              <!-- Selected appellant preview -->
              <div v-if="selectedAppellant?.id" class="selected-preview">
                <div class="flex items-center gap-2 mb-2">
                  <div class="preview-avatar"><i class="pi pi-building"></i></div>
                  <div>
                    <p class="font-semibold text-sm" style="color:#1E293B">{{ selectedAppellant.firstName }} {{ selectedAppellant.lastName || '' }}</p>
                    <p class="text-xs" style="color:#64748B">TIN: {{ selectedAppellant.tinNumber || '-' }} | Phone: {{ selectedAppellant.phone || '-' }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs" style="color:#64748B">
                  <div>Email: {{ selectedAppellant.email || '-' }}</div>
                  <div>Business: {{ selectedAppellant.natureOfBusiness || '-' }}</div>
                  <div class="col-span-2">Address: {{ selectedAppellant.address || '-' }}</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="field-label">Region</label>
                <Select v-model="form.regionId" :options="regions" optionLabel="name" optionValue="id" placeholder="Select Region" class="w-full" />
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <Button label="Next" icon="pi pi-arrow-right" iconPos="right" class="trab-btn" @click="activateCallback('2')" :disabled="!form.appellantId" />
            </div>
          </StepPanel>

          <!-- Step 2: Taxation -->
          <StepPanel v-slot="{ activateCallback }" value="2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div><label class="field-label">Date of Taxation Decision *</label><InputText v-model="form.dateOfTaxationDecision" type="date" class="w-full" /></div>
              <div><label class="field-label">Date of Service of Decision *</label><InputText v-model="form.dateOfServiceDecision" type="date" class="w-full" /></div>
              <div><label class="field-label">Date of Lodging</label><InputText v-model="form.loggedAt" type="date" class="w-full" /></div>
              <div><label class="field-label">Appeal Against</label><Select v-model="form.description" :options="['Whole Decision','Part of Decision']" placeholder="Select" class="w-full" /></div>
              <div class="md:col-span-2"><label class="field-label">Additional Respondent</label><InputText v-model="form.additionalRespondent" class="w-full" placeholder="Optional (default: Commissioner General TRA)" /></div>
              <div class="md:col-span-2 flex items-center gap-2"><input type="checkbox" v-model="form.isExempted" id="ex" /><label for="ex" class="text-sm">Bypass date of service checks</label></div>
              <div v-if="form.isExempted" class="md:col-span-2"><label class="field-label">Reason for bypass</label><Textarea v-model="form.exemptionDateServiceReason" rows="2" class="w-full" /></div>
            </div>
            <div class="flex justify-between pt-2">
              <Button label="Back" icon="pi pi-arrow-left" text @click="activateCallback('1')" />
              <Button label="Review" icon="pi pi-arrow-right" iconPos="right" class="trab-btn" @click="activateCallback('3')" :disabled="!form.dateOfTaxationDecision || !form.dateOfServiceDecision" />
            </div>
          </StepPanel>

          <!-- Step 3: Review -->
          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="py-4">
              <h3 class="font-semibold mb-3" style="color:#1E293B">Review Your Notice</h3>
              <div class="review-grid">
                <div class="view-row"><span class="view-label">Appellant</span><span class="view-value">{{ selectedAppellant?.firstName }} {{ selectedAppellant?.lastName || '' }}</span></div>
                <div class="view-row"><span class="view-label">TIN</span><span class="view-value">{{ selectedAppellant?.tinNumber || '-' }}</span></div>
                <div class="view-row"><span class="view-label">Phone</span><span class="view-value">{{ selectedAppellant?.phone || '-' }}</span></div>
                <div class="view-row"><span class="view-label">Taxation Decision</span><span class="view-value">{{ form.dateOfTaxationDecision }}</span></div>
                <div class="view-row"><span class="view-label">Service Date</span><span class="view-value">{{ form.dateOfServiceDecision }}</span></div>
                <div class="view-row"><span class="view-label">Lodging Date</span><span class="view-value">{{ form.loggedAt }}</span></div>
                <div class="view-row"><span class="view-label">Appeal Against</span><span class="view-value">{{ form.description || '-' }}</span></div>
                <div class="view-row"><span class="view-label">Respondent</span><span class="view-value">Commissioner General TRA{{ form.additionalRespondent ? `, ${form.additionalRespondent}` : '' }}</span></div>
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button label="Back" icon="pi pi-arrow-left" text @click="activateCallback('2')" />
              <Button label="Submit Notice" icon="pi pi-check" class="trab-btn" :loading="saving" @click="submit" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>

    <!-- Quick Register Dialog -->
    <Dialog v-model:visible="quickRegister" header="Register New Appellant" modal :style="{width:'500px'}">
      <div class="flex flex-col gap-3 mt-2">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Name / Company *</label><InputText v-model="newAppellant.firstName" class="w-full" /></div>
          <div><label class="field-label">Last Name</label><InputText v-model="newAppellant.lastName" class="w-full" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">TIN Number</label><InputText v-model="newAppellant.tinNumber" class="w-full" /></div>
          <div><label class="field-label">Phone</label><InputText v-model="newAppellant.phone" class="w-full" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Email</label><InputText v-model="newAppellant.email" class="w-full" /></div>
          <div><label class="field-label">Business</label><InputText v-model="newAppellant.natureOfBusiness" class="w-full" /></div>
        </div>
        <div><label class="field-label">Address</label><InputText v-model="newAppellant.address" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="quickRegister = false" />
        <Button label="Register & Select" class="trab-btn" @click="registerAndSelect" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; font-family: 'Poppins', sans-serif; }
.selected-preview { background: #f8faf9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.preview-avatar { width: 2.25rem; height: 2.25rem; border-radius: 8px; background: rgba(27,107,61,0.08); color: #1B6B3D; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.review-grid { display: flex; flex-direction: column; }
.view-row { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; }
</style>
