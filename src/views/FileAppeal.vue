<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
// AutoComplete removed — using Select + Add pattern
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { SelfServiceAppeals, SelfServiceAppellants } from '@/service/SelfServiceApi.js';
import { TaxTypeService, CurrencyService } from '@/service/SettingsService.js';
import api from '@/service/Api.js';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const saving = ref(false);

// Lookups
const appellants = ref([]);
const taxTypes = ref([]);
const currencies = ref([]);
const respondents = ref([]);

// Appellant list
const selectedAppellantToAdd = ref(null);
const appellantList = ref([]);

// Respondent list
const additionalRespondents = ref([]);
const selectedRespondent = ref(null);
const nonDefaultRespondents = ref([]);

// Amounts & witnesses
const amounts = ref([]);
const newAmount = ref({ amount: null, currency: 'TZS' });
const witnesses = ref([]);
const newWitness = ref({ name: '', phone: '' });

const form = ref({
  appellantId: null,
  noticeNo: route.query.noticeNo || '',
  dateOfFiling: new Date().toISOString().split('T')[0],
  taxTypeId: null,
  natureOfAppeal: '',
  assessmentNo: '',
  bankNo: '',
  billEntryNo: '',
  taxedOffice: '',
  annextures: '',
  appellantIds: [],
  respondentIds: [],
});

onMounted(async () => {
  try {
    const [a, tt, cur, resp] = await Promise.all([
      SelfServiceAppellants.getAll(),
      TaxTypeService.getAll(),
      CurrencyService.getAll(),
      api.get('/self-service/respondents').then(r => r.data.data || []).catch(() => []),
    ]);
    appellants.value = a.map(ap => ({ ...ap, displayName: `${ap.firstName} ${ap.lastName || ''} ${ap.tinNumber ? '(' + ap.tinNumber + ')' : ''}`.trim() }));
    taxTypes.value = tt;
    currencies.value = cur;
    respondents.value = resp;
    nonDefaultRespondents.value = resp.filter(r => !r.isDefault);
  } catch {}
});

// Appellant list management
const addAppellantToList = () => {
  if (!selectedAppellantToAdd.value) return;
  if (appellantList.value.find(a => a.id === selectedAppellantToAdd.value.id)) return;
  appellantList.value.push(selectedAppellantToAdd.value);
  // First appellant = primary, rest = co-appellants
  form.value.appellantId = appellantList.value[0].id;
  form.value.appellantIds = appellantList.value.slice(1).map(a => a.id);
  selectedAppellantToAdd.value = null;
};
const removeAppellantFromList = (ap) => {
  appellantList.value = appellantList.value.filter(a => a.id !== ap.id);
  form.value.appellantId = appellantList.value.length ? appellantList.value[0].id : null;
  form.value.appellantIds = appellantList.value.slice(1).map(a => a.id);
};

// Respondent list management
const addRespondent = () => {
  if (!selectedRespondent.value || selectedRespondent.value.isDefault) return;
  if (additionalRespondents.value.find(r => r.id === selectedRespondent.value.id)) return;
  additionalRespondents.value.push(selectedRespondent.value);
  form.value.respondentIds = additionalRespondents.value.map(r => r.id);
  selectedRespondent.value = null;
};
const removeRespondent = (r) => {
  additionalRespondents.value = additionalRespondents.value.filter(x => x.id !== r.id);
  form.value.respondentIds = additionalRespondents.value.map(x => x.id);
};

// Amounts
const addAmount = () => {
  if (!newAmount.value.amount) return;
  amounts.value.push({ ...newAmount.value });
  newAmount.value = { amount: null, currency: 'TZS' };
};
const removeAmount = (i) => amounts.value.splice(i, 1);

// Witnesses
const addWitness = () => {
  if (!newWitness.value.name) return;
  witnesses.value.push({ ...newWitness.value });
  newWitness.value = { name: '', phone: '' };
};
const removeWitness = (i) => witnesses.value.splice(i, 1);

const submit = async () => {
  if (!appellantList.value.length || !form.value.taxTypeId) {
    toast.add({ severity: 'warn', summary: 'Required', detail: 'At least one appellant and Tax Category are required', life: 3000 });
    return;
  }
  saving.value = true;
  try {
    await SelfServiceAppeals.create({
      ...form.value,
      amounts: amounts.value,
      witnesses: witnesses.value,
    });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Statement of Appeal filed successfully!', life: 4000 });
    router.push('/appeals');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.description || 'Filing failed', life: 4000 });
  } finally { saving.value = false; }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>File Statement of Appeal</h2>
      <p>Complete the steps below to lodge your statement of appeal</p>
    </div>

    <div class="ss-card">
      <Stepper value="1" linear>
        <StepList>
          <Step value="1">Parties</Step>
          <Step value="2">Tax Dispute</Step>
          <Step value="3">Amounts & Witnesses</Step>
          <Step value="4">Review & Submit</Step>
        </StepList>
        <StepPanels>
          <!-- Step 1: Parties -->
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="py-4">
              <!-- Notice -->
              <div class="mb-4" v-if="form.noticeNo">
                <label class="field-label">Notice Number</label>
                <InputText v-model="form.noticeNo" class="w-full" disabled style="background:#f0fdf4" />
              </div>

              <!-- Appellant List -->
              <div class="mb-4">
                <label class="section-label"><i class="pi pi-users"></i> Appellant List</label>
                <p class="help-text">Select the companies or individuals filing this appeal. You can add multiple appellants.</p>
                <div class="flex gap-2 mb-2">
                  <Select v-model="selectedAppellantToAdd" :options="appellants" optionLabel="displayName" placeholder="Select Appellants" class="flex-1" filter />
                  <Button label="+ Add" class="add-btn" @click="addAppellantToList" :disabled="!selectedAppellantToAdd" />
                </div>
                <div v-for="(a, i) in appellantList" :key="a.id" class="party-row">
                  <div class="flex items-center gap-2">
                    <span class="party-num">{{ i + 1 }}</span>
                    <div>
                      <span class="party-name">{{ a.firstName }} {{ a.lastName || '' }}</span>
                      <span class="party-detail">TIN: {{ a.tinNumber || '-' }} | {{ a.phone || '-' }}</span>
                    </div>
                  </div>
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeAppellantFromList(a)" />
                </div>
                <div v-if="!appellantList.length" class="empty-list">No appellants added yet</div>
              </div>

              <!-- Respondent List -->
              <div class="mb-4">
                <label class="section-label"><i class="pi pi-building"></i> Respondent List</label>
                <p class="help-text">The party you are appealing against. Commissioner General (TRA) is added automatically.</p>
                <div class="party-row default-row">
                  <div class="flex items-center gap-2">
                    <span class="party-num">1</span>
                    <span class="party-name">Commissioner General - Tanzania Revenue Authority</span>
                  </div>
                  <Tag value="Default" severity="success" style="font-size:0.65rem" />
                </div>
                <div class="flex gap-2 mt-2 mb-2">
                  <Select v-model="selectedRespondent" :options="nonDefaultRespondents" optionLabel="name" placeholder="Select Respondents" class="flex-1" filter />
                  <Button label="+ Add" class="add-btn" @click="addRespondent" :disabled="!selectedRespondent" />
                </div>
                <div v-for="(r, i) in additionalRespondents" :key="r.id" class="party-row">
                  <div class="flex items-center gap-2">
                    <span class="party-num">{{ i + 2 }}</span>
                    <span class="party-name">{{ r.name }}</span>
                  </div>
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeRespondent(r)" />
                </div>
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <Button label="Next" icon="pi pi-arrow-right" iconPos="right" class="trab-btn" @click="activateCallback('2')" :disabled="!appellantList.length" />
            </div>
          </StepPanel>

          <!-- Step 2: Tax Dispute -->
          <StepPanel v-slot="{ activateCallback }" value="2">
            <p class="help-text py-2">Provide details about the tax decision you are appealing. Tax Category is required.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div><label class="field-label">Tax Category *</label><Select v-model="form.taxTypeId" :options="taxTypes" optionLabel="name" optionValue="id" placeholder="Select" class="w-full" /></div>
              <div><label class="field-label">Nature of Appeal</label><InputText v-model="form.natureOfAppeal" class="w-full" /></div>
              <div><label class="field-label">Assessment No.</label><InputText v-model="form.assessmentNo" class="w-full" /></div>
              <div><label class="field-label">Bank Payment Advice No.</label><InputText v-model="form.bankNo" class="w-full" /></div>
              <div><label class="field-label">Bill of Entry No.</label><InputText v-model="form.billEntryNo" class="w-full" /></div>
              <div><label class="field-label">Taxed Office</label><InputText v-model="form.taxedOffice" class="w-full" /></div>
            </div>
            <div class="flex justify-between pt-2">
              <Button label="Back" icon="pi pi-arrow-left" text @click="activateCallback('1')" />
              <Button label="Next" icon="pi pi-arrow-right" iconPos="right" class="trab-btn" @click="activateCallback('3')" :disabled="!form.taxTypeId" />
            </div>
          </StepPanel>

          <!-- Step 3: Amounts & Witnesses -->
          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="py-4">
              <h4 class="text-sm font-semibold mb-1" style="color:#475569">Tax Amount in Dispute</h4>
              <p class="help-text mb-3">Enter the tax amount(s) you are disputing. You can add multiple amounts in different currencies.</p>
              <div class="flex gap-2 mb-3">
                <Select v-model="newAmount.currency" :options="currencies.length ? currencies.map(c=>c.code||c.name) : ['TZS','USD']" class="w-32" />
                <InputNumber v-model="newAmount.amount" placeholder="Amount" class="flex-1" :minFractionDigits="2" />
                <Button label="Add" icon="pi pi-plus" size="small" outlined @click="addAmount" />
              </div>
              <div v-for="(a,i) in amounts" :key="i" class="party-row">
                <span>{{ a.currency }} {{ Number(a.amount).toLocaleString('en-US', {minimumFractionDigits:2}) }}</span>
                <Button icon="pi pi-times" text rounded size="small" severity="danger" @click="removeAmount(i)" />
              </div>

              <h4 class="text-sm font-semibold mt-4 mb-1" style="color:#475569">Witnesses</h4>
              <p class="help-text mb-3">List any witnesses who will testify in support of your appeal. Include their full name and phone number.</p>
              <div class="flex gap-2 mb-3">
                <InputText v-model="newWitness.name" placeholder="Full Name" class="flex-1" />
                <InputText v-model="newWitness.phone" placeholder="Phone" class="w-40" />
                <Button label="Add" icon="pi pi-plus" size="small" outlined @click="addWitness" />
              </div>
              <div v-for="(w,i) in witnesses" :key="i" class="party-row">
                <span>{{ w.name }} <small style="color:#64748B">{{ w.phone }}</small></span>
                <Button icon="pi pi-times" text rounded size="small" severity="danger" @click="removeWitness(i)" />
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button label="Back" icon="pi pi-arrow-left" text @click="activateCallback('2')" />
              <Button label="Review" icon="pi pi-arrow-right" iconPos="right" class="trab-btn" @click="activateCallback('4')" />
            </div>
          </StepPanel>

          <!-- Step 4: Review -->
          <StepPanel v-slot="{ activateCallback }" value="4">
            <div class="py-4">
              <h3 class="font-semibold mb-3" style="color:#1E293B">Review Your Statement of Appeal</h3>
              <div class="review-grid">
                <div class="view-row"><span class="view-label">Notice No.</span><span class="view-value">{{ form.noticeNo || '-' }}</span></div>
                <div class="view-row"><span class="view-label">Appellants</span><span class="view-value">{{ appellantList.map(a => a.firstName + ' ' + (a.lastName || '')).join(', ') }}</span></div>
                <div class="view-row"><span class="view-label">Respondents</span><span class="view-value">Commissioner General - TRA{{ additionalRespondents.length ? ', ' + additionalRespondents.map(r => r.name).join(', ') : '' }}</span></div>
                <div class="view-row"><span class="view-label">Tax Category</span><span class="view-value">{{ taxTypes.find(t => t.id === form.taxTypeId)?.name || '-' }}</span></div>
                <div class="view-row"><span class="view-label">Nature of Appeal</span><span class="view-value">{{ form.natureOfAppeal || '-' }}</span></div>
                <div v-if="amounts.length" class="view-row"><span class="view-label">Amounts</span><span class="view-value">{{ amounts.map(a => `${a.currency} ${Number(a.amount).toLocaleString()}`).join(', ') }}</span></div>
                <div v-if="witnesses.length" class="view-row"><span class="view-label">Witnesses</span><span class="view-value">{{ witnesses.map(w => w.name).join(', ') }}</span></div>
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button label="Back" icon="pi pi-arrow-left" text @click="activateCallback('3')" />
              <Button label="Submit Statement" icon="pi pi-check" class="trab-btn" :loading="saving" @click="submit" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.2rem; }
.section-label { display: block; font-size: 0.85rem; font-weight: 700; color: #1E293B; margin-bottom: 0.3rem; }
.section-label i { margin-right: 0.4rem; color: #1B6B3D; }
.help-text { font-size: 0.76rem; color: #94a3b8; margin-bottom: 0.5rem; line-height: 1.4; }
.party-row { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.75rem; font-size:0.82rem; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:0.4rem; background:#fff; }
.default-row { background:#f0fdf4; border-color:#86efac; }
.party-num { width:24px; height:24px; background:#1B6B3D; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; flex-shrink:0; }
.party-name { font-weight:600; color:#1E293B; display:block; font-size:0.82rem; }
.party-detail { color:#64748B; font-size:0.72rem; display:block; }
.empty-list { text-align:center; padding:1rem; color:#94a3b8; font-size:0.8rem; border:1px dashed #e2e8f0; border-radius:8px; }
.add-btn { background:#1B6B3D!important; border-color:#1B6B3D!important; font-weight:600; min-width:100px; }
.trab-btn { background:#1B6B3D!important; border-color:#1B6B3D!important; }
.review-grid { display:flex; flex-direction:column; }
.view-row { display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0; border-bottom:1px solid #f8f9fa; font-size:0.84rem; }
.view-label { color:#64748B; }
.view-value { color:#1E293B; font-weight:500; }
</style>
