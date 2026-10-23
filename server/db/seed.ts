import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { execute, queryOne } from './index.ts';

export async function seedDatabaseIfEmpty(): Promise<void> {
  const existingUser = await queryOne('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    return; // Already initialized
  }

  console.log('Seeding initial synthetic demonstration dataset...');

  // 1. Create default demo user
  const userId = 'usr_academic_demo_01';
  const passwordHash = await bcrypt.hash('academic123', 10);
  await execute(
    `INSERT INTO users (id, email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, 'researcher@univ.edu', passwordHash, 'Dr. Alex Vance', 'Lead Researcher']
  );

  // Ensure uploads directory exists
  const uploadsDir = process.env.STORAGE_DIR || './uploads';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create minimal valid PDF files for the synthetic papers
  const createMockPdf = (filename: string, title: string, text: string) => {
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      // Valid minimal PDF 1.4 stream containing synthetic text
      const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n4 0 obj\n<< /Length 200 >>\nstream\nBT /F1 12 Tf 72 712 Td (${title}) Tj 0 -24 Td (${text.replace(/[()]/g, '')}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n00000000 inventory \n0000000115 00000 n \n0000000280 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n540\n%%EOF`;
      fs.writeFileSync(filePath, content);
    }
  };

  const p1Id = 'paper_synth_01';
  const p1File = `${p1Id}_federated_edge.pdf`;
  createMockPdf(p1File, 'Synthetic Study: Federated Edge Telehealth', 'Demonstration text for federated learning latency bottlenecks.');

  const p2Id = 'paper_synth_02';
  const p2File = `${p2Id}_quantized_transformers.pdf`;
  createMockPdf(p2File, 'Synthetic Study: Quantized Bio-Transformers', 'Demonstration text for bio-signal quantization on wearables.');

  const p3Id = 'paper_synth_03';
  const p3File = `${p3Id}_multimodal_graph_cl.pdf`;
  createMockPdf(p3File, 'Synthetic Study: Multimodal Graph CL', 'Demonstration text for rare clinical graph contrastive learning.');

  // 2. Insert Papers
  await execute(
    `INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p1Id,
      userId,
      '[Synthetic Dataset] Edge-Assisted Federated Learning in Latency-Constrained Telehealth Networks',
      'paper_federated_edge_telehealth_synthetic.pdf',
      p1File,
      142850,
      'a1b2c3d4e5f601',
      'application/pdf',
      'analyzed'
    ]
  );

  await execute(
    `INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p2Id,
      userId,
      '[Synthetic Dataset] Adaptive 4-Bit Quantization for Transformer-Based Bio-Signal Processing on Ultra-Low-Power Wearables',
      'paper_quantized_transformers_synthetic.pdf',
      p2File,
      189200,
      'b2c3d4e5f6a102',
      'application/pdf',
      'analyzed'
    ]
  );

  await execute(
    `INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p3Id,
      userId,
      '[Synthetic Dataset] Multi-Modal Graph Contrastive Learning for Longitudinal Rare Disease Trajectory Prediction',
      'paper_multimodal_graph_cl_synthetic.pdf',
      p3File,
      215400,
      'c3d4e5f6a1b203',
      'application/pdf',
      'analyzed'
    ]
  );

  // 3. Insert Paper Metadata
  await execute(
    `INSERT INTO paper_metadata (
      id, paper_id, abstract, authors, publication_year, keywords, research_domain,
      problem_statement, methodology, algorithms, datasets, metrics, results_contributions,
      limitations, future_work, references_list, page_count, raw_extracted_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'meta_synth_01',
      p1Id,
      'Decentralized model training over battery-powered telehealth sensors suffers from straggler delays and non-IID distributional drift. This synthetic paper proposes an asynchronous client scheduling framework using tiered edge aggregation.',
      JSON.stringify(['Dr. Elena Rostova', 'K. Tanaka', 'M. Sundaram']),
      2025,
      JSON.stringify(['Federated Learning', 'Edge Computing', 'Telehealth', 'Asynchronous Aggregation', 'Non-IID Drift']),
      'Distributed Systems & Health Informatics',
      'High communication overhead and client dropout during synchronous federated rounds across intermittent 5G edge nodes.',
      'Tiered asynchronous aggregation with dynamic staleness penalty and gradient compression.',
      JSON.stringify(['Async-FedAvg', 'Top-K Gradient Sparsification', 'Kalman Filter Latency Estimator']),
      JSON.stringify(['Synthetic-PhysioNet-2025', 'MIMIC-IV-Extracted Benchmark', 'Simulated 5G RAN Logs']),
      JSON.stringify({ 'Round Completion Time': '38% reduction', 'AUC-ROC': '0.912', 'Communication Overhead': '-45%' }),
      'Demonstrated 38% faster convergence under bursty packet loss while maintaining within 1.2% accuracy of centralized baselines.',
      JSON.stringify([
        'Assumes static client participation probabilities that do not account for circadian user disconnects.',
        'No formal differential privacy guarantees implemented during gradient sparsification.',
        'Tested primarily on simulated synthetic channel fading rather than multi-carrier live testbeds.'
      ]),
      JSON.stringify([
        'Integrate Renyi Differential Privacy with bounded noise injection.',
        'Deploy across physical Raspberry Pi 5 edge nodes with heterogeneous hardware accelerators.'
      ]),
      JSON.stringify([
        'McMahan et al. Communication-Efficient Learning of Deep Networks from Decentralized Data (2017)',
        'Li et al. Federated Optimization in Heterogeneous Networks (MLSys 2020)',
        'Kairouz et al. Advances and Open Problems in Federated Learning (2021)'
      ]),
      12,
      'Extracted synthetic text content for paper 1.'
    ]
  );

  await execute(
    `INSERT INTO paper_metadata (
      id, paper_id, abstract, authors, publication_year, keywords, research_domain,
      problem_statement, methodology, algorithms, datasets, metrics, results_contributions,
      limitations, future_work, references_list, page_count, raw_extracted_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'meta_synth_02',
      p2Id,
      'Continuous continuous-wave photoplethysmography and ECG monitoring on wearable devices demands sub-milliwatt inference. We evaluate post-training mixed-precision INT4/FP8 quantization of linear self-attention layers.',
      JSON.stringify(['Marcus Chen', 'Sara Lindqvist', 'Arun Patel']),
      2025,
      JSON.stringify(['Wearable Devices', 'Post-Training Quantization', 'Linear Attention', 'ECG Anomaly Detection', 'Energy Efficiency']),
      'Embedded Machine Learning & Bio-Sensors',
      'Quadratic attention memory complexity causes memory overflow and thermal throttling on microcontrollers with <512KB SRAM.',
      'Post-training outlier-aware mixed-precision quantization combined with kernelized linear attention kernels.',
      JSON.stringify(['Outlier-Preserved INT4', 'Fast Performer Attention', 'Dynamic Scale Calibration']),
      JSON.stringify(['MIT-BIH Arrhythmia Synthetic Subset', 'CapnoBase Respiratory Data', 'ARM Cortex-M55 Power Traces']),
      JSON.stringify({ 'Model Size': '1.8 MB (down from 14.2 MB)', 'F1-Score': '0.894', 'Energy per Window': '0.42 mJ' }),
      'Achieved real-time inference on ARM Cortex-M55 consuming under 0.42 mJ per 5-second bio-signal window with <1.5% degradation in macro F1.',
      JSON.stringify([
        'Evaluated only on adult resting-state data; movement artifacts during intense physical exercise degrade signal fidelity significantly.',
        'Quantization calibration set requires 1000 clean calibration slices which may not be available for rare arrhythmias.',
        'Did not evaluate on-device fine-tuning or personalized patient adaptation.'
      ]),
      JSON.stringify([
        'Explore few-shot on-device memory-efficient adaptation using Low-Rank Adapters (LoRA).',
        'Incorporate multi-modal photoplethysmography alongside accelerometer motion compensation.'
      ]),
      JSON.stringify([
        'Dettmers et al. LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale (NeurIPS 2022)',
        'Katharopoulos et al. Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention (ICML 2020)',
        'Goldberger et al. PhysioBank, PhysioToolkit, and PhysioNet (Circulation 2000)'
      ]),
      10,
      'Extracted synthetic text content for paper 2.'
    ]
  );

  await execute(
    `INSERT INTO paper_metadata (
      id, paper_id, abstract, authors, publication_year, keywords, research_domain,
      problem_statement, methodology, algorithms, datasets, metrics, results_contributions,
      limitations, future_work, references_list, page_count, raw_extracted_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'meta_synth_03',
      p3Id,
      'Rare disease clinical trajectories suffer from extreme class imbalance, missing longitudinal lab tests, and irregular sampling intervals. We propose a temporal graph contrastive learning architecture.',
      JSON.stringify(['Hana Takahashi', 'David O. Mensah', 'Dr. Rachel Green']),
      2024,
      JSON.stringify(['Graph Neural Networks', 'Contrastive Learning', 'Rare Diseases', 'Irregular Time-Series', 'EHR Mining']),
      'Healthcare AI & Graph Representation Learning',
      'Severe sparsity of rare disease phenotypes leads standard temporal models to overfit on common comorbidities.',
      'Heterogeneous temporal graph construction with adaptive time-decay edge weighting and sub-graph contrastive perturbation.',
      JSON.stringify(['Temporal-GNN', 'InfoNCE Contrastive Loss', 'Hawkes Process Edge Weighting']),
      JSON.stringify(['Synthetic Orphanet Cohort', 'EHR Longitudinal Benchmark 2024', 'Simulated ICD-10 Pathways']),
      JSON.stringify({ 'AUPRC': '0.742', 'Specificity': '0.931', 'Early Prediction Lead Time': '14.2 months' }),
      'Superior lead-time prediction by an average of 14.2 months prior to formal clinical diagnosis compared to baseline LSTM and Transformer models.',
      JSON.stringify([
        'High computational cost during dynamic graph construction for cohorts exceeding 50,000 nodes.',
        'Lacks cross-institutional external validation across differing electronic health record ontologies (e.g., SNOMED vs ICD-10).',
        'Model decisions lack mechanistic biological interpretability for attending physicians.'
      ]),
      JSON.stringify([
        'Formulate causal graph neural networks to disentangle correlation from biological causality.',
        'Develop federated multi-site evaluation across standardized OMOP Common Data Model databases.'
      ]),
      JSON.stringify([
        'You et al. Graph Contrastive Learning with Augmentations (NeurIPS 2020)',
        'Choi et al. Doctor AI: Predicting Clinical Events via Recurrent Neural Networks (JMLR 2016)',
        'Kipf & Welling. Semi-Supervised Classification with Graph Convolutional Networks (ICLR 2017)'
      ]),
      14,
      'Extracted synthetic text content for paper 3.'
    ]
  );

  // 4. Insert Candidate Research Gaps
  const gap1Id = 'gap_synth_01';
  await execute(
    `INSERT INTO candidate_research_gaps (id, user_id, paper_ids, gap_title, gap_description, gap_category, severity, validation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gap1Id,
      userId,
      JSON.stringify([p1Id, p2Id]),
      'Absence of Battery-Aware Energy Profiling in Edge-Assisted Telehealth Quantization Pipelines',
      'While Paper 1 addresses network latency and Paper 2 achieves 4-bit quantization, neither framework investigates the coupled impact of on-device backpropagation and radio transmission on wearable battery drain. Existing evaluations decouple compression from dynamic wireless channel fading.',
      'Methodological',
      'High',
      'Validated'
    ]
  );

  const gap2Id = 'gap_synth_02';
  await execute(
    `INSERT INTO candidate_research_gaps (id, user_id, paper_ids, gap_title, gap_description, gap_category, severity, validation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gap2Id,
      userId,
      JSON.stringify([p2Id, p3Id]),
      'Lack of Motion-Robust Adaptation for Wearable Anomaly Detection in Real-World Ambulatory Cohorts',
      'Paper 2 validates anomaly detection purely on resting-state synthetic waveforms, and Paper 3 assumes clean longitudinal lab intervals. There is an empirical literature gap regarding transformer stability when subjected to non-stationary motion noise in ambulatory rare disease monitoring.',
      'Empirical',
      'Medium',
      'Candidate'
    ]
  );

  const gap3Id = 'gap_synth_03';
  await execute(
    `INSERT INTO candidate_research_gaps (id, user_id, paper_ids, gap_title, gap_description, gap_category, severity, validation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gap3Id,
      userId,
      JSON.stringify([p1Id, p3Id]),
      'Cross-Institutional Privacy-Preserving Evaluation Across Standardized OMOP Health Ontologies',
      'Both federated telehealth aggregation (Paper 1) and temporal GNN models (Paper 3) are evaluated inside isolated single-ontology synthetic benchmarks. No established framework validates cross-site federated graph representations across differing EHR coding standards under strict formal differential privacy.',
      'Practical/Application',
      'High',
      'Validated'
    ]
  );

  // 5. Insert Gap Evidence records
  await execute(
    `INSERT INTO gap_evidence (id, gap_id, paper_id, excerpt, section_name, page_number, confidence_score, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ev_synth_01',
      gap1Id,
      p1Id,
      '"Assumes static client participation probabilities that do not account for circadian user disconnects... primary evaluations conducted on simulated channel fading."',
      'Section 6: Limitations',
      11,
      0.94,
      'The authors explicitly cite that radio transmission power constraints and battery depletion curves were omitted from the asynchronous scheduling algorithm.'
    ]
  );

  await execute(
    `INSERT INTO gap_evidence (id, gap_id, paper_id, excerpt, section_name, page_number, confidence_score, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ev_synth_02',
      gap1Id,
      p2Id,
      '"Did not evaluate on-device fine-tuning or personalized patient adaptation... focused strictly on inference energy rather than cumulative backprop energy."',
      'Section 5.3: Hardware Trade-offs',
      9,
      0.91,
      'Paper 2 quantifies inference energy at 0.42 mJ but leaves continuous federated gradient exchanges unmeasured.'
    ]
  );

  await execute(
    `INSERT INTO gap_evidence (id, gap_id, paper_id, excerpt, section_name, page_number, confidence_score, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ev_synth_03',
      gap2Id,
      p2Id,
      '"Evaluated only on adult resting-state data; movement artifacts during intense physical exercise degrade signal fidelity significantly."',
      'Section 7: Threats to Validity',
      10,
      0.96,
      'Direct admission by the authors that external validity fails under real ambulatory movement noise.'
    ]
  );

  // 6. Insert Future Research Recommendations
  await execute(
    `INSERT INTO recommendations (id, gap_id, user_id, recommendation_title, proposed_methodology, expected_impact, feasibility_rating, potential_challenges, suggested_datasets)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'rec_synth_01',
      gap1Id,
      userId,
      'Energy-Harvesting-Aware Federated Client Scheduling with Dynamic INT4/FP8 Mixed Precision',
      'Formulate a Lyapunov optimization framework that dynamically throttles local gradient quantization precision based on instantaneous supercapacitor energy reserves and channel signal-to-noise ratio.',
      'Reduces wearable battery depletion by up to 60% during multi-day continuous monitoring trials while maintaining target model convergence rates.',
      'High',
      'Requires hardware-in-the-loop power instrumentation across heterogeneous wearable development boards (e.g. nRF5340, ESP32-S3).',
      JSON.stringify(['Cisco IoT Fading Dataset', 'PhysioNet Challenge 2025 Multi-Day Sensor Logs', 'BLE 5.2 Energy Traces'])
    ]
  );

  await execute(
    `INSERT INTO recommendations (id, gap_id, user_id, recommendation_title, proposed_methodology, expected_impact, feasibility_rating, potential_challenges, suggested_datasets)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'rec_synth_02',
      gap2Id,
      userId,
      'Self-Supervised Contrastive Motion Denoising Front-End for Ultra-Low-Bit Quantized Bio-Transformers',
      'Integrate an auxiliary 3-axis accelerometer self-supervised encoder that projects motion artifacts into an orthogonal latent subspace prior to INT4 linear attention calculation.',
      'Preserves ECG arrhythmia detection accuracy above 88% macro F1 even during vigorous treadmill and ambulatory user movement.',
      'Moderate',
      'Memory budget constraints on microcontroller SRAM when caching both accelerometer and ECG feature maps.',
      JSON.stringify(['Simulated Ambulatory ECG Motion Benchmark', 'WISDM Activity Dataset', 'CapnoBase Respiratory Benchmark'])
    ]
  );

  await execute(
    `INSERT INTO recommendations (id, gap_id, user_id, recommendation_title, proposed_methodology, expected_impact, feasibility_rating, potential_challenges, suggested_datasets)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'rec_synth_03',
      gap3Id,
      userId,
      'Privacy-Guaranteed Multi-Site Federated Graph Neural Networks Aligned to OMOP CDM',
      'Develop cross-institutional graph mapping layers that harmonize distinct hospital vocabulary sets into OMOP concepts before applying Local Differential Privacy with adaptive Gaussian noise.',
      'Enables joint collaborative clinical rare outcome forecasting across disparate hospital networks without centralized patient record aggregation.',
      'Challenging',
      'Semantic ontology drift and institutional compliance review across distinct healthcare jurisdictions.',
      JSON.stringify(['MIMIC-IV OMOP CDM Extract', 'Synthetic eICU Collaborative Research Database', 'Synthea Patient Population Generator'])
    ]
  );

  // 7. Insert Initial Analysis History
  await execute(
    `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'hist_01',
      userId,
      'upload',
      'Uploaded 3 synthetic demonstration research papers to system library',
      p1Id,
      'paper',
      JSON.stringify({ count: 3, batch: 'Synthetic Demonstration Benchmark' })
    ]
  );

  await execute(
    `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'hist_02',
      userId,
      'extract',
      'Extracted structured sections, metrics, and limitations for 3 papers',
      p1Id,
      'paper_metadata',
      JSON.stringify({ engine: 'nlp-adapter', accuracy: 'verified' })
    ]
  );

  await execute(
    `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'hist_03',
      userId,
      'gap_discovery',
      'Discovered 3 verified research gaps across telehealth & embedded ML domains',
      gap1Id,
      'candidate_research_gaps',
      JSON.stringify({ highSeverity: 2, mediumSeverity: 1 })
    ]
  );

  console.log('Synthetic demonstration dataset seeded successfully.');
}
