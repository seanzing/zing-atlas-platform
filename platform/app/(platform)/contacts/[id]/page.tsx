"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  Badge,
  Avatar,
  Btn,
  FormField,
  Input,
} from "@/components/ui";
import {
  Z,
  fmt,
  STATUS_COLORS,
  LEAD_SOURCE_COLORS,
} from "@/lib/constants";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface OnboardingItem {
  id: string;
  item_name: string;
  status: string;
  due_date: string;
}

// Campaign data is included inline from the contacts API

interface ContactDetail {
  id: string;
  name: string;
  email: string;
  secondary_email: string | null;
  company: string;
  phone: string;
  status: string;
  last_contact: string;
  value: number;
  notes: string | null;
  lead_source: string;
  campaign_id: string | null;
  avatar: string | null;
  deals: Deal[];
  tickets: Ticket[];
  onboarding: OnboardingItem[];
}

const TABS = ["Customer Info", "Pre Sale Comms", "Post Sale Comms", "Cancelled"];

function generateTimeline(
  contact: ContactDetail,
  tab: string
): { channel: string; date: string; note: string; color: string }[] {
  const entries: { channel: string; date: string; note: string; color: string }[] = [];

  if (tab === "Pre Sale Comms") {
    // Generate from deals and lead info
    if (contact.deals && contact.deals.length > 0) {
      contact.deals.forEach((deal) => {
        entries.push({
          channel: "Pipeline",
          date: new Date(deal.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          note: `Deal "${deal.title}" created - ${fmt(deal.value)} - Stage: ${deal.stage}`,
          color: Z.ultramarine,
        });
      });
    }
    entries.push({
      channel: contact.lead_source,
      date: new Date(contact.last_contact).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      note: `Initial outreach via ${contact.lead_source.toLowerCase()} campaign`,
      color: LEAD_SOURCE_COLORS[contact.lead_source] || Z.bluejeans,
    });
    entries.push({
      channel: "System",
      date: new Date(contact.last_contact).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      note: `Contact added as ${contact.status} from ${contact.lead_source} source`,
      color: Z.turquoise,
    });
    if (contact.notes) {
      entries.push({
        channel: "Note",
        date: new Date(contact.last_contact).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: contact.notes,
        color: Z.violet,
      });
    }
  } else if (tab === "Post Sale Comms") {
    // Generate from onboarding and tickets
    if (contact.onboarding && contact.onboarding.length > 0) {
      contact.onboarding.forEach((item) => {
        entries.push({
          channel: "Onboarding",
          date: new Date(item.due_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          note: `${item.item_name} - ${item.status}`,
          color: item.status === "complete" ? "#10b981" : Z.bluejeans,
        });
      });
    }
    if (contact.tickets && contact.tickets.length > 0) {
      contact.tickets.forEach((ticket) => {
        entries.push({
          channel: "Support",
          date: new Date(ticket.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          note: `${ticket.subject} [${ticket.priority}] - ${ticket.status}`,
          color: ticket.status === "resolved" ? "#10b981" : "#ef4444",
        });
      });
    }
    if (entries.length === 0) {
      entries.push({
        channel: "System",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "No post-sale communications yet",
        color: Z.grey,
      });
    }
  } else if (tab === "Cancelled") {
    if (contact.status === "Cancelled") {
      entries.push({
        channel: "System",
        date: new Date(contact.last_contact).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "Customer status changed to Cancelled",
        color: "#ef4444",
      });
      entries.push({
        channel: "Win-Back",
        date: new Date(contact.last_contact).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "Added to win-back campaign queue",
        color: Z.violet,
      });
    } else if (contact.status === "DNC") {
      entries.push({
        channel: "System",
        date: new Date(contact.last_contact).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "Contact marked as Do Not Contact",
        color: Z.grey,
      });
    } else {
      entries.push({
        channel: "System",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "No cancellation history",
        color: Z.grey,
      });
    }
  }

  return entries;
}

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: contact, mutate } = useSWR<ContactDetail>(`/api/contacts/${id}`);
  const { data: campaigns } = useSWR<{ id: string; name: string; type: string }[]>(
    "/api/campaigns"
  );

  const [activeTab, setActiveTab] = useState("Customer Info");
  const [editing, setEditing] = useState(false);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSecondaryEmail, setEditSecondaryEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  if (!contact) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: Z.textMuted,
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }

  const campaignMap = new Map((campaigns || []).map((c) => [c.id, c]));
  const campaign = contact.campaign_id
    ? campaignMap.get(contact.campaign_id)
    : null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const startEdit = () => {
    setEditName(contact.name);
    setEditCompany(contact.company);
    setEditEmail(contact.email);
    setEditSecondaryEmail(contact.secondary_email || "");
    setEditPhone(contact.phone);
    setEditNotes(contact.notes || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        company: editCompany,
        email: editEmail,
        secondary_email: editSecondaryEmail || null,
        phone: editPhone,
        notes: editNotes,
      }),
    });
    mutate();
    setEditing(false);
  };

  const preSaleCount =
    (contact.deals ? contact.deals.length : 0) + (contact.notes ? 1 : 0) + 1;
  const postSaleCount =
    (contact.onboarding ? contact.onboarding.length : 0) +
    (contact.tickets ? contact.tickets.length : 0);

  const tabCounts: Record<string, number | null> = {
    "Customer Info": null,
    "Pre Sale Comms": preSaleCount,
    "Post Sale Comms": postSaleCount || null,
    Cancelled: null,
  };

  const timelineEntries = generateTimeline(contact, activeTab);

  return (
    <div>
      {/* Back button */}
      <Link
        href="/contacts"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: Z.ultramarine,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        ← Back to Contacts
      </Link>

      {/* Contact header card */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Avatar initials={getInitials(contact.name)} index={0} size={48} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: Z.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            {contact.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 4,
              fontSize: 13,
              color: Z.textSecondary,
            }}
          >
            <span>{contact.company}</span>
            <span style={{ color: Z.borderLight }}>|</span>
            <span>{contact.email}</span>
            <span style={{ color: Z.borderLight }}>|</span>
            <span>{contact.phone}</span>
          </div>
        </div>
        <Badge
          label={contact.status}
          color={STATUS_COLORS[contact.status] || Z.grey}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          background: Z.bg,
          borderRadius: 10,
          padding: 4,
          display: "inline-flex",
          gap: 2,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background:
                activeTab === tab
                  ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                  : "transparent",
              color: activeTab === tab ? "#fff" : Z.textSecondary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab}
            {tabCounts[tab] !== null && tabCounts[tab] !== undefined && (
              <span
                style={{
                  background:
                    activeTab === tab ? "rgba(255,255,255,0.25)" : Z.border,
                  color: activeTab === tab ? "#fff" : Z.textMuted,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 10,
                }}
              >
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Customer Info" && (
        <div>
          {/* Contact Details Card */}
          <div
            style={{
              background: Z.card,
              borderRadius: 16,
              border: `1px solid ${Z.border}`,
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                }}
              >
                Contact Details
              </div>
              {!editing ? (
                <Btn variant="secondary" small onClick={startEdit}>
                  Edit
                </Btn>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="secondary" small onClick={cancelEdit}>
                    Cancel
                  </Btn>
                  <Btn small onClick={saveEdit}>
                    Save
                  </Btn>
                </div>
              )}
            </div>

            {!editing ? (
              /* Read mode - 3 column grid */
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 20,
                  }}
                >
                  <DetailField label="Primary Email" value={contact.email} />
                  <DetailField
                    label="Secondary Email"
                    value={contact.secondary_email || "--"}
                  />
                  <DetailField label="Phone" value={contact.phone} />
                  <DetailField label="Company" value={contact.company} />
                  <DetailField
                    label="Pipeline Value"
                    value={fmt(contact.value)}
                  />
                  <DetailField
                    label="Last Contact"
                    value={new Date(contact.last_contact).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  />
                  <DetailField label="Lead Source">
                    <Badge
                      label={contact.lead_source}
                      color={
                        LEAD_SOURCE_COLORS[contact.lead_source] || Z.grey
                      }
                    />
                  </DetailField>
                  <DetailField label="Status">
                    <Badge
                      label={contact.status}
                      color={STATUS_COLORS[contact.status] || Z.grey}
                    />
                  </DetailField>
                  <DetailField label="Campaign">
                    {campaign ? (
                      <Badge label={campaign.name} color={Z.bluejeans} />
                    ) : (
                      <span style={{ fontSize: 13, color: Z.textMuted }}>
                        --
                      </span>
                    )}
                  </DetailField>
                </div>
                {contact.notes && (
                  <div style={{ marginTop: 20 }}>
                    <DetailField label="Notes" value={contact.notes} />
                  </div>
                )}
              </div>
            ) : (
              /* Edit mode - 2 column grid */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <FormField label="Name">
                  <Input
                    value={editName}
                    onChange={setEditName}
                    placeholder="Full name"
                  />
                </FormField>
                <FormField label="Company">
                  <Input
                    value={editCompany}
                    onChange={setEditCompany}
                    placeholder="Company"
                  />
                </FormField>
                <div>
                  <FormField label="Primary Email">
                    <Input
                      value={editEmail}
                      onChange={setEditEmail}
                      placeholder="Email"
                      type="email"
                    />
                  </FormField>
                  {contact.secondary_email && (
                    <button
                      onClick={() => setShowSecondaryEmail(!showSecondaryEmail)}
                      style={{
                        background: "none",
                        border: "none",
                        color: Z.ultramarine,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                        marginTop: -8,
                      }}
                    >
                      {showSecondaryEmail
                        ? "Hide secondary email"
                        : "Show secondary email"}
                    </button>
                  )}
                  {showSecondaryEmail && (
                    <div style={{ marginTop: 8 }}>
                      <FormField label="Secondary Email">
                        <Input
                          value={editSecondaryEmail}
                          onChange={setEditSecondaryEmail}
                          placeholder="Secondary email"
                          type="email"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
                <FormField label="Phone">
                  <Input
                    value={editPhone}
                    onChange={setEditPhone}
                    placeholder="Phone"
                    type="tel"
                  />
                </FormField>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FormField label="Notes">
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: Z.bg,
                        border: `1px solid ${Z.border}`,
                        borderRadius: 8,
                        color: Z.textPrimary,
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* Deals + Tickets - 2 column */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            {/* Deals */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "24px 28px",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  marginBottom: 16,
                }}
              >
                Deals
              </div>
              {contact.deals && contact.deals.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contact.deals.map((deal) => (
                    <div
                      key={deal.id}
                      style={{
                        padding: "12px 16px",
                        background: Z.bg,
                        borderRadius: 10,
                        border: `1px solid ${Z.borderLight}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.textPrimary,
                          }}
                        >
                          {deal.title}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.textPrimary,
                          }}
                        >
                          {fmt(deal.value)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Badge label={deal.stage} color={Z.ultramarine} />
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {new Date(deal.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: Z.textMuted,
                    fontSize: 13,
                  }}
                >
                  No deals yet
                </div>
              )}
            </div>

            {/* Support Tickets */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "24px 28px",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  marginBottom: 16,
                }}
              >
                Support Tickets
              </div>
              {contact.tickets && contact.tickets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contact.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      style={{
                        padding: "12px 16px",
                        background: Z.bg,
                        borderRadius: 10,
                        border: `1px solid ${Z.borderLight}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.textPrimary,
                          }}
                        >
                          {ticket.subject}
                        </span>
                        <Badge
                          label={ticket.priority}
                          color={
                            ticket.priority === "high"
                              ? "#ef4444"
                              : ticket.priority === "medium"
                              ? Z.bluejeans
                              : Z.grey
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Badge
                          label={ticket.status}
                          color={STATUS_COLORS[ticket.status] || Z.grey}
                        />
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {new Date(ticket.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: Z.textMuted,
                    fontSize: 13,
                  }}
                >
                  No support tickets
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline tabs: Pre Sale, Post Sale, Cancelled */}
      {(activeTab === "Pre Sale Comms" ||
        activeTab === "Post Sale Comms" ||
        activeTab === "Cancelled") && (
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            padding: "28px 32px",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: Z.textPrimary,
              marginBottom: 24,
            }}
          >
            {activeTab}
          </div>

          {timelineEntries.length > 0 ? (
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: Z.borderLight,
                  borderRadius: 1,
                }}
              />

              {timelineEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    paddingBottom: i < timelineEntries.length - 1 ? 24 : 0,
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: -24,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: entry.color,
                      border: `2px solid ${Z.card}`,
                      boxShadow: `0 0 0 2px ${entry.color}30`,
                    }}
                  />

                  {/* Content */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <Badge label={entry.channel} color={entry.color} />
                      <span
                        style={{
                          fontSize: 12,
                          color: Z.textMuted,
                        }}
                      >
                        {entry.date}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: Z.textPrimary,
                        lineHeight: 1.5,
                      }}
                    >
                      {entry.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: Z.textMuted,
                fontSize: 13,
              }}
            >
              No entries
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Read-only detail field helper */
function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: Z.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children || (
        <div style={{ fontSize: 13, color: Z.textPrimary, fontWeight: 500 }}>
          {value}
        </div>
      )}
    </div>
  );
}
