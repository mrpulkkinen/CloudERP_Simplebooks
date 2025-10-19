import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'License | CloudERP Simplebooks'
};

export default function LicensePage() {
  return (
    <section className="card-grid">
      <article className="card">
        <h2>CloudERP Simplebooks License</h2>
        <p>
          CloudERP grants you a personal, non-exclusive, non-transferable, and revocable
          license to install, access, and use the CloudERP Simplebooks platform solely for your
          internal business operations. Except for the limited rights expressly provided in this
          notice, CloudERP retains all worldwide right, title, and interest in and to the
          software, services, documentation, and any related intellectual property.
        </p>
        <p>
          You may configure the application for your own use and create reasonable backups. You
          may not sublicense, rent, sell, publicly host, reverse engineer, or create derivative
          works of the platform except where such restrictions are prohibited by law.
        </p>
      </article>

      <article className="card">
        <h3>Contributor Rights and Obligations</h3>
        <p>
          By submitting any code, documentation, designs, or other materials (&quot;Contribution&quot;),
          you represent that you have the right to do so and that the Contribution does not
          infringe the rights of any third party. You hereby assign to CloudERP all rights,
          titles, and interests worldwide in and to each Contribution, including all associated
          intellectual property rights.
        </p>
        <p>
          CloudERP may use, modify, redistribute, sublicense, and commercialize Contributions in
          any manner without obligation to you. You retain the right to reference your work as a
          Contribution for personal portfolios and professional records, provided such references
          do not disclose CloudERP confidential information.
        </p>
      </article>

      <article className="card">
        <h3>End User Commitments</h3>
        <ul>
          <li>
            Ensure that all authorized users comply with this license and applicable laws when
            accessing the platform.
          </li>
          <li>
            Maintain the confidentiality of any non-public information obtained through the use of
            CloudERP Simplebooks.
          </li>
          <li>
            Promptly notify CloudERP of any suspected misuse, infringement, or security incident
            related to the platform.
          </li>
        </ul>
      </article>

      <article className="card">
        <h3>Termination</h3>
        <p>
          CloudERP may suspend or terminate your rights under this license at any time if you
          breach these terms. Upon termination, you must cease all use of the platform and destroy
          any local copies or backups in your possession. Sections relating to ownership,
          confidentiality, warranties, and liability survive termination.
        </p>
        <p>
          Continued use of CloudERP Simplebooks after updates to this license constitutes
          acceptance of the revised terms. For questions about permitted use or to request written
          permissions, contact your CloudERP representative.
        </p>
      </article>
    </section>
  );
}
