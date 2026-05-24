import React from 'react';
import PublicLegalPage from '../components/PublicLegalPage';

export default function CancellationPage() {
  return (
    <PublicLegalPage
      slug="cancellation-refund-policy"
      defaultTitle="Cancellation & Refund Policy"
      pageClassName="page-60 page-legal page-typography"
    >
      <main className="section page-60 page-legal page-typography">
      <div className="container">
        <h1>Cancellation &amp; Refund Policy</h1>

        <p>
          At Love and Flour by Pooja, we strive to provide the best online learning experience. As our products are digital courses (recorded or
          live), we follow a transparent cancellation and refund policy.
        </p>

        <h2>1. Cancellations</h2>
        <p>Once a course has been purchased and access has been granted, cancellations are not possible.</p>
        <p>
          For live workshops, cancellation requests may be considered only if received at least 7 days prior to the scheduled start date.
          Requests received after this period will not be eligible for cancellation.
        </p>

        <h2>2. Refunds</h2>
        <p>
          <strong>Recorded/Pre-recorded Courses:</strong> Since access to content is granted immediately upon purchase, refunds are not
          available.
        </p>
        <p>
          <strong>Live Workshops / Special Programs:</strong> In cases where cancellations are requested within the specified time (7 days
          prior), refunds will be processed after deducting applicable administrative or payment gateway charges.
        </p>
        <p>
          If Love and Flour by Pooja cancels or reschedules a live class/workshop, registered learners will be offered either a full refund or
          credit towards another program, as per their choice.
        </p>
        <p>
          Please note – 15-20 working days will be taken to process the refund and credit the amount to the learner’s bank account / payment
          mode that was used while placing the order.
        </p>

        <h2>3. Course Access Duration</h2>
        <p>
          Access duration is clearly mentioned in the course details (typically 2 years, but may vary). Refunds will not be entertained on
          grounds of dissatisfaction with access timelines once disclosed at purchase.
        </p>

        <h2>4. Technical Issues</h2>
        <p>
          If you face technical issues that prevent you from accessing a course, please contact us at tech.loveandflourbypooja@gmail.com. We
          will make every effort to resolve the issue.
        </p>
        <p>
          Refunds will not be provided for issues related to internet connectivity, device compatibility, or other factors outside our control.
        </p>

        <h2>5. Discretionary Refunds</h2>
        <p>
          In rare cases, refunds may be considered at the sole discretion of Love and Flour by Pooja, subject to review.
        </p>
      </div>
    </main>
    </PublicLegalPage>
  );
}
